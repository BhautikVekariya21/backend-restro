import request from 'supertest';
import express, { json } from 'express';
import { connect, connection } from 'mongoose';
import router from '../routes/AdminRoute.js'
import Vendor, { deleteMany, create } from '../models/Vendor.js'
import DeliveryUser, { deleteMany as _deleteMany, create as _create } from '../models/DeliveryUser.js';
import Transaction, { deleteMany as __deleteMany } from '../models/Transaction.js';
import { generatePassword } from '../utility/PasswordUnility.js';

// Mock dependencies
jest.mock('cloudinary');
jest.mock('../utility/PasswordUnility', () => ({
  generatePassword: jest.fn(),
}));
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('Admin Routes Extreme Test Cases', () => {
  let app;

  // Setup Express app with admin routes
  beforeAll(async () => {
    app = express();
    app.use(json());
    app.use('/admin', router);
    await connect(process.env.MONGO_URI || global.__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  // Clean up database after each test
  afterEach(async () => {
    await deleteMany({});
    await _deleteMany({});
    await __deleteMany({});
  });

  // Close database connection after all tests
  afterAll(async () => {
    await connection.close();
  });

  // POST /admin/vendor - CreateVendor
  describe('POST /admin/vendor', () => {
    it('should reject vendor creation with missing required fields', async () => {
      const response = await request(app)
        .post('/admin/vendor')
        .send({}); // Empty body

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should reject vendor creation with invalid email format', async () => {
      const response = await request(app)
        .post('/admin/vendor')
        .send({
          name: 'Test Vendor',
          address: '123 Test St',
          pincode: '123456',
          foodType: ['Italian'],
          email: 'invalid-email', // Invalid email
          password: 'Password123!',
          ownerName: 'John Doe',
          phone: '9876543210',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Error creating vendor');
    });

    it('should reject vendor creation with duplicate email', async () => {
      generatePassword.mockResolvedValue('hashedPassword');
      await create({
        name: 'Existing Vendor',
        email: 'testvendor@example.com',
        password: 'hashedPassword',
        address: '123 Test St',
        pincode: '123456',
        foodType: ['Italian'],
        ownerName: 'Jane Doe',
        phone: '9876543210',
      });

      const response = await request(app)
        .post('/admin/vendor')
        .send({
          name: 'Test Vendor',
          address: '123 Test St',
          pincode: '123456',
          foodType: ['Italian'],
          email: 'testvendor@example.com', // Duplicate email
          password: 'Password123!',
          ownerName: 'John Doe',
          phone: '9876543210',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('A vendor exists with this email ID');
    });

    it('should reject vendor creation with extremely long input', async () => {
      const longString = 'a'.repeat(1000); // Extremely long string
      const response = await request(app)
        .post('/admin/vendor')
        .send({
          name: longString,
          address: longString,
          pincode: '123456',
          foodType: ['Italian'],
          email: `testvendor_${longString}@example.com`,
          password: 'Password123!',
          ownerName: longString,
          phone: '9876543210',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should handle database failure during vendor creation', async () => {
      // Mock Vendor.create to throw an error
      jest.spyOn(Vendor, 'create').mockRejectedValueOnce(new Error('Database failure'));

      const response = await request(app)
        .post('/admin/vendor')
        .send({
          name: 'Test Vendor',
          address: '123 Test St',
          pincode: '123456',
          foodType: ['Italian'],
          email: 'testvendor@example.com',
          password: 'Password123!',
          ownerName: 'John Doe',
          phone: '9876543210',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error creating vendor');
    });
  });

  // GET /admin/vendors - GetVendors
  describe('GET /admin/vendors', () => {
    it('should return 404 when no vendors exist', async () => {
      const response = await request(app).get('/admin/vendors');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Vendors data not available');
    });

    it('should handle database failure when fetching vendors', async () => {
      jest.spyOn(Vendor, 'find').mockRejectedValueOnce(new Error('Database failure'));

      const response = await request(app).get('/admin/vendors');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error fetching vendors');
    });

    it('should return vendors when they exist', async () => {
      await create({
        name: 'Test Vendor',
        email: 'testvendor@example.com',
        password: 'hashedPassword',
        address: '123 Test St',
        pincode: '123456',
        foodType: ['Italian'],
        ownerName: 'John Doe',
        phone: '9876543210',
      });

      const response = await request(app).get('/admin/vendors');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('Test Vendor');
      expect(response.body[0].password).toBeUndefined(); // Password should be excluded
    });
  });

  // GET /admin/vendor/:id - GetVendorByID
  describe('GET /admin/vendor/:id', () => {
    it('should reject invalid vendor ID format', async () => {
      const response = await request(app).get('/admin/vendor/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error fetching vendor');
    });

    it('should return 404 for non-existent vendor ID', async () => {
      const response = await request(app).get('/admin/vendor/507f1f77bcf86cd799439102');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Vendor data not available');
    });

    it('should handle database failure when fetching vendor by ID', async () => {
      jest.spyOn(Vendor, 'findById').mockRejectedValueOnce(new Error('Database failure'));

      const response = await request(app).get('/admin/vendor/507f1f77bcf86cd799439102');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error fetching vendor');
    });
  });

  // GET /admin/transactions - GetTransactions
  describe('GET /admin/transactions', () => {
    it('should return 404 when no transactions exist', async () => {
      const response = await request(app).get('/admin/transactions');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Transactions data not available');
    });

    it('should handle database failure when fetching transactions', async () => {
      jest.spyOn(Transaction, 'find').mockRejectedValueOnce(new Error('Database failure'));

      const response = await request(app).get('/admin/transactions');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error fetching transactions');
    });
  });

  // GET /admin/transaction/:id - GetTransactionById
  describe('GET /admin/transaction/:id', () => {
    it('should reject invalid transaction ID format', async () => {
      const response = await request(app).get('/admin/transaction/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error fetching transaction');
    });

    it('should return 404 for non-existent transaction ID', async () => {
      const response = await request(app).get('/admin/transaction/67fbed499cc509a25cfbe1e6');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Transaction data not available');
    });

    it('should handle database failure when fetching transaction by ID', async () => {
      jest.spyOn(Transaction, 'findById').mockRejectedValueOnce(new Error('Database failure'));

      const response = await request(app).get('/admin/transaction/67fbed499cc509a25cfbe1e6');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error fetching transaction');
    });
  });

  // PUT /admin/delivery/verify - VerifyDeliveryUser
  describe('PUT /admin/delivery/verify', () => {
    it('should reject verification with missing _id', async () => {
      const response = await request(app)
        .put('/admin/delivery/verify')
        .send({ status: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Delivery user ID is required');
    });

    it('should reject verification with invalid _id format', async () => {
      const response = await request(app)
        .put('/admin/delivery/verify')
        .send({ _id: 'invalid-id', status: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Unable to verify Delivery User');
    });

    it('should return 400 for non-existent delivery user', async () => {
      const response = await request(app)
        .put('/admin/delivery/verify')
        .send({ _id: '67fbf22b1ba0390e8486b035', status: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Unable to verify Delivery User');
    });

    it('should handle database failure during verification', async () => {
      jest.spyOn(DeliveryUser, 'findById').mockRejectedValueOnce(new Error('Database failure'));

      const response = await request(app)
        .put('/admin/delivery/verify')
        .send({ _id: '67fbf22b1ba0390e8486b035', status: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error verifying delivery user');
    });

    it('should verify delivery user successfully', async () => {
      const deliveryUser = await _create({
        email: 'delivery@example.com',
        password: 'hashedPassword',
        phone: '9876543210',
        firstName: 'Test',
        lastName: 'Delivery',
        address: '123 Test St',
        pincode: '123456',
        verified: false,
      });

      const response = await request(app)
        .put('/admin/delivery/verify')
        .send({ _id: deliveryUser._id, status: true });

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
      expect(response.body.password).toBeUndefined();
    });
  });

  // GET /admin/delivery/users - GetDeliveryUsers
  describe('GET /admin/delivery/users', () => {
    it('should return 404 when no delivery users exist', async () => {
      const response = await request(app).get('/admin/delivery/users');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Unable to get Delivery Users');
    });

    it('should handle database failure when fetching delivery users', async () => {
      jest.spyOn(DeliveryUser, 'find').mockRejectedValueOnce(new Error('Database failure'));

      const response = await request(app).get('/admin/delivery/users');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error fetching delivery users');
    });

    it('should return delivery users when they exist', async () => {
      await _create({
        email: 'delivery@example.com',
        password: 'hashedPassword',
        phone: '9876543210',
        firstName: 'Test',
        lastName: 'Delivery',
        address: '123 Test St',
        pincode: '123456',
        verified: false,
      });

      const response = await request(app).get('/admin/delivery/users');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].firstName).toBe('Test');
      expect(response.body[0].password).toBeUndefined();
    });
  });

  // GET /admin/ - Root Route
  describe('GET /admin/', () => {
    it('should return welcome message', async () => {
      const response = await request(app).get('/admin/');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Hello from Admin');
    });
  });
});