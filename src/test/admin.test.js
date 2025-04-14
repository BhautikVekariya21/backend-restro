import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import router from '../routes/AdminRoute.js'; // Adjust path to your router file
import Vendor from '../models/Vendor.js'; // Adjust path to your model file
import Transaction from '../models/Transaction.js'; // Adjust path to your model file
import DeliveryUser from '../models/DeliveryUser.js'; // Adjust path to your model file  
import { generatePassword } from '../utility/PasswordUnility.js'
// Mock utility functions
jest.mock('../utility', () => ({
  generateSalt: jest.fn(),
  generatePassword: jest.fn(),
}));

// Create Express app
const app = express();
app.use(express.json());
app.use('/admin', router);

describe('AdminController', () => {
  let mongoServer;

  // Setup MongoDB in-memory server before all tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Clear database and reset mocks before each test
  beforeEach(async () => {
    await Vendor.deleteMany({});
    await Transaction.deleteMany({});
    await DeliveryUser.deleteMany({});
    jest.clearAllMocks();
  });

  // Disconnect and stop server after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // CreateVandor Tests
  describe('POST /admin/vendor', () => {
    it('should create a new vendor successfully', async () => {
      generateSalt.mockResolvedValue('mocked_salt');
      generatePassword.mockResolvedValue('mocked_hashed_password');

      const input = {
        name: 'Tasty Bites',
        address: '123 Main St',
        pincode: '12345',
        foodType: ['Italian', 'Fast Food'],
        email: 'vendor@example.com',
        password: 'secure123',
        ownerName: 'John Doe',
        phone: '1234567890',
      };

      const response = await request(app).post('/admin/vendor').send(input);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Tasty Bites',
        email: 'vendor@example.com',
        password: 'mocked_hashed_password',
        salt: 'mocked_salt',
        rating: 0,
        serviceAvailable: false,
      });

      // Verify database
      const vendor = await Vendor.findOne({ email: 'vendor@example.com' });
      expect(vendor).toBeTruthy();
      expect(vendor.name).toBe('Tasty Bites');
    });

    it('should return error if vendor email exists', async () => {
      await Vendor.create({
        email: 'vendor@example.com',
        name: 'Existing Vendor',
        password: 'hashed',
        salt: 'salt',
      });

      const input = {
        name: 'Tasty Bites',
        address: '123 Main St',
        pincode: '12345',
        foodType: ['Italian'],
        email: 'vendor@example.com',
        password: 'secure123',
        ownerName: 'John Doe',
        phone: '1234567890',
      };

      const response = await request(app).post('/admin/vendor').send(input);

      expect(response.status).toBe(200); // Controller returns 200 for JSON responses
      expect(response.body).toEqual({
        message: 'A vandor is exist with this email ID',
      });
    });

    it('should handle missing required fields', async () => {
      const input = {
        name: 'Tasty Bites',
        // Missing email, password, etc.
      };

      const response = await request(app).post('/admin/vendor').send(input);

      expect(response.status).toBe(200); // Should be 400 with validation
      // Note: Controller doesn't validate; expect database error or partial creation
      // If schema enforces required fields, this would fail in DB
    });
  });

  // GetVanndors Tests
  describe('GET /admin/vendors', () => {
    it('should return all vendors', async () => {
      await Vendor.create([
        { name: 'Vendor1', email: 'vendor1@example.com', pincode: '12345' },
        { name: 'Vendor2', email: 'vendor2@example.com', pincode: '67890' },
      ]);

      const response = await request(app).get('/admin/vendors');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Vendor1' }),
          expect.objectContaining({ name: 'Vendor2' }),
        ])
      );
    });

    it('should return message if no vendors exist', async () => {
      const response = await request(app).get('/admin/vendors');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Vendors data not available' });
    });
  });

  // GetVandorByID Tests
  describe('GET /admin/vendor/:id', () => {
    it('should return vendor by ID', async () => {
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        email: 'vendor@example.com',
        pincode: '12345',
      });

      const response = await request(app).get(`/admin/vendor/${vendor._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Tasty Bites',
        email: 'vendor@example.com',
      });
    });

    it('should return message if vendor not found', async () => {
      const response = await request(app).get(
        `/admin/vendor/${new mongoose.Types.ObjectId()}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Vendors data not available' });
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app).get('/admin/vendor/invalid_id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Vendors data not available' });
    });
  });

  // GetTransactions Tests
  describe('GET /admin/transactions', () => {
    it('should return all transactions', async () => {
      await Transaction.create([
        { amount: 100, status: 'COMPLETED' },
        { amount: 200, status: 'PENDING' },
      ]);

      const response = await request(app).get('/admin/transactions');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ amount: 100 }),
          expect.objectContaining({ amount: 200 }),
        ])
      );
    });

    it('should return message if no transactions exist', async () => {
      const response = await request(app).get('/admin/transactions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Transactions data not available' });
    });
  });

  // GetTransactionById Tests
  describe('GET /admin/transaction/:id', () => {
    it('should return transaction by ID', async () => {
      const transaction = await Transaction.create({
        amount: 100,
        status: 'COMPLETED',
      });

      const response = await request(app).get(
        `/admin/transaction/${transaction._id}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        amount: 100,
        status: 'COMPLETED',
      });
    });

    it('should return message if transaction not found', async () => {
      const response = await request(app).get(
        `/admin/transaction/${new mongoose.Types.ObjectId()}`
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Transaction data not available' });
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app).get('/admin/transaction/invalid_id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Transaction data not available' });
    });
  });

  // VerifyDeliveryUser Tests
  describe('PUT /admin/delivery/verify', () => {
    it('should verify delivery user successfully', async () => {
      const deliveryUser = await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        verified: false,
      });

      const input = {
        _id: deliveryUser._id.toString(),
        status: true,
      };

      const response = await request(app)
        .put('/admin/delivery/verify')
        .send(input);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: 'delivery@example.com',
        verified: true,
      });

      // Verify database
      const updatedUser = await DeliveryUser.findById(deliveryUser._id);
      expect(updatedUser.verified).toBe(true);
    });

    it('should return error if _id missing', async () => {
      const input = { status: true };

      const response = await request(app)
        .put('/admin/delivery/verify')
        .send(input);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to verify Delivery User' });
    });

    it('should return error if delivery user not found', async () => {
      const input = {
        _id: new mongoose.Types.ObjectId().toString(),
        status: true,
      };

      const response = await request(app)
        .put('/admin/delivery/verify')
        .send(input);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to verify Delivery User' });
    });
  });

  // GetDeliveryUsers Tests
  describe('GET /admin/delivery/users', () => {
    it('should return all delivery users', async () => {
      await DeliveryUser.create([
        {
          email: 'delivery1@example.com',
          phone: '1234567890',
          verified: false,
        },
        {
          email: 'delivery2@example.com',
          phone: '0987654321',
          verified: true,
        },
      ]);

      const response = await request(app).get('/admin/delivery/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ email: 'delivery1@example.com' }),
          expect.objectContaining({ email: 'delivery2@example.com' }),
        ])
      );
    });

    it('should return message if no delivery users exist', async () => {
      const response = await request(app).get('/admin/delivery/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to get Delivery Users' });
    });
  });

  // Root Route Test
  describe('GET /admin/', () => {
    it('should return welcome message', async () => {
      const response = await request(app).get('/admin/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Hello from Admin' });
    });
  });
});