import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import  DeliveryUser  from '../models/DeliveryUser.js';
import {
  DeliverySignUp,
  DeliveryLogin,
  GetDeliveryProfile,
  EditDeliveryProfile,
  UpdateDeliveryUserStatus,
} from '../controllers/DeliveryController.js';
import {
  generateSalt,
  generatePassword,
  validatePassword,
  generateSignature,
} from '../utility/PasswordUtility.js';

// Mock utility functions
jest.mock('../utility', () => ({
  generateSalt: jest.fn(),
  generatePassword: jest.fn(),
  validatePassword: jest.fn(),
  generateSignature: jest.fn(),
}));

// Create Express app
const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = req.headers['x-user'] ? JSON.parse(req.headers['x-user']) : null;
  next();
};

// Define routes
app.post('/delivery/signup', DeliverySignUp);
app.post('/delivery/login', DeliveryLogin);
app.get('/delivery/profile', mockAuth, GetDeliveryProfile);
app.patch('/delivery/profile', mockAuth, EditDeliveryProfile);
app.patch('/delivery/status', mockAuth, UpdateDeliveryUserStatus);

describe('DeliveryController', () => {
  let mongoServer;

  // Setup MongoDB in-memory server before all tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Clear database before each test
  beforeEach(async () => {
    await DeliveryUser.deleteMany({});
    jest.clearAllMocks();
  });

  // Disconnect and stop server after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // DeliverySignUp Tests
  describe('POST /delivery/signup', () => {
    it('should create a new delivery user successfully', async () => {
      // Mock utility functions
      generateSalt.mockResolvedValue('mocked_salt');
      generatePassword.mockResolvedValue('mocked_hashed_password');
      generateSignature.mockResolvedValue('mocked_jwt_token');

      const input = {
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'secure123',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        pincode: '12345',
      };

      const response = await request(app)
        .post('/delivery/signup')
        .send(input);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        signature: 'mocked_jwt_token',
        verified: false,
        email: 'delivery@example.com',
      });

      // Verify user in database
      const user = await DeliveryUser.findOne({ email: 'delivery@example.com' });
      expect(user).toBeTruthy();
      expect(user.firstName).toBe('John');
      expect(user.phone).toBe('1234567890');
      expect(user.verified).toBe(false);
    });

    it('should return 400 if email already exists', async () => {
      await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
        verified: false,
      });

      const input = {
        email: 'delivery@example.com',
        phone: '0987654321',
        password: 'secure123',
      };

      const response = await request(app)
        .post('/delivery/signup')
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('A delivery user exists with the provided email!');
    });

    it('should return 400 for invalid email', async () => {
      const input = {
        email: 'invalid_email',
        phone: '1234567890',
        password: 'secure123',
      };

      const response = await request(app)
        .post('/delivery/signup')
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error creating delivery user');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          message: 'Please provide a valid email address',
        })
      );
    });

    it('should return 400 for invalid phone', async () => {
      const input = {
        email: 'delivery@example.com',
        phone: '123', // Too short
        password: 'secure123',
      };

      const response = await request(app)
        .post('/delivery/signup')
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error creating delivery user');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          message: 'Phone number must be 7 to 12 digits',
        })
      );
    });

    it('should return 400 for short password', async () => {
      const input = {
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'short', // Less than 6 characters
      };

      const response = await request(app)
        .post('/delivery/signup')
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error creating delivery user');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          message: 'Password must be at least 6 characters',
        })
      );
    });

    it('should return 400 for invalid firstName', async () => {
      const input = {
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'secure123',
        firstName: 'J1', // Contains number
      };

      const response = await request(app)
        .post('/delivery/signup')
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error creating delivery user');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          message: 'First name can only contain letters, spaces, or hyphens',
        })
      );
    });
  });

  // DeliveryLogin Tests
  describe('POST /delivery/login', () => {
    it('should login successfully with correct credentials', async () => {
      await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed_password',
        salt: 'mocked_salt',
        verified: false,
      });

      validatePassword.mockResolvedValue(true);
      generateSignature.mockResolvedValue('mocked_jwt_token');

      const input = {
        email: 'delivery@example.com',
        password: 'secure123',
      };

      const response = await request(app)
        .post('/delivery/login')
        .send(input);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        signature: 'mocked_jwt_token',
        email: 'delivery@example.com',
        verified: false,
      });
      expect(validatePassword).toHaveBeenCalledWith(
        'secure123',
        'hashed_password',
        'mocked_salt'
      );
    });

    it('should return 400 for invalid email', async () => {
      const input = {
        email: 'wrong@example.com',
        password: 'secure123',
      };

      const response = await request(app)
        .post('/delivery/login')
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 400 for incorrect password', async () => {
      await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed_password',
        salt: 'mocked_salt',
      });

      validatePassword.mockResolvedValue(false);

      const input = {
        email: 'delivery@example.com',
        password: 'wrong_password',
      };

      const response = await request(app)
        .post('/delivery/login')
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 400 for missing credentials', async () => {
      const input = {};

      const response = await request(app)
        .post('/delivery/login')
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  // GetDeliveryProfile Tests
  describe('GET /delivery/profile', () => {
    it('should fetch delivery user profile successfully', async () => {
      const user = await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
        firstName: 'John',
        verified: false,
      });

      const response = await request(app)
        .get('/delivery/profile')
        .set('x-user', JSON.stringify({ _id: user._id.toString() }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        email: 'delivery@example.com',
        firstName: 'John',
        verified: false,
      });
    });

    it('should return 401 if unauthorized', async () => {
      const response = await request(app).get('/delivery/profile');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 400 if user not found', async () => {
      const response = await request(app)
        .get('/delivery/profile')
        .set('x-user', JSON.stringify({ _id: new mongoose.Types.ObjectId().toString() }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Delivery user not found');
    });
  });

  // EditDeliveryProfile Tests
  describe('PATCH /delivery/profile', () => {
    it('should update delivery user profile successfully', async () => {
      const user = await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        pincode: '12345',
      });

      const input = {
        firstName: 'Jane',
        address: '456 Elm St',
      };

      const response = await request(app)
        .patch('/delivery/profile')
        .set('x-user', JSON.stringify({ _id: user._id.toString() }))
        .send(input);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        firstName: 'Jane',
        lastName: 'Doe',
        address: '456 Elm St',
        pincode: '12345',
      });

      // Verify database
      const updatedUser = await DeliveryUser.findById(user._id);
      expect(updatedUser.firstName).toBe('Jane');
      expect(updatedUser.address).toBe('456 Elm St');
    });

    it('should return 401 if unauthorized', async () => {
      const response = await request(app)
        .patch('/delivery/profile')
        .send({ firstName: 'Jane' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 400 if user not found', async () => {
      const response = await request(app)
        .patch('/delivery/profile')
        .set('x-user', JSON.stringify({ _id: new mongoose.Types.ObjectId().toString() }))
        .send({ firstName: 'Jane' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Delivery user not found');
    });

    it('should return 400 for invalid pincode', async () => {
      const user = await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
      });

      const input = {
        pincode: '123', // Invalid
      };

      const response = await request(app)
        .patch('/delivery/profile')
        .set('x-user', JSON.stringify({ _id: user._id.toString() }))
        .send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Error updating profile');
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({
          message: 'Pincode must be 5 or 6 digits',
        })
      );
    });

    it('should handle partial updates', async () => {
      const user = await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
        firstName: 'John',
      });

      const input = {
        lastName: 'Smith',
      };

      const response = await request(app)
        .patch('/delivery/profile')
        .set('x-user', JSON.stringify({ _id: user._id.toString() }))
        .send(input);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        firstName: 'John',
        lastName: 'Smith',
      });
    });
  });

  // UpdateDeliveryUserStatus Tests
  describe('PATCH /delivery/status', () => {
    it('should toggle isAvailable when not provided', async () => {
      const user = await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
        isAvailable: false,
      });

      const response = await request(app)
        .patch('/delivery/status')
        .set('x-user', JSON.stringify({ _id: user._id.toString() }))
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.isAvailable).toBe(true);

      // Verify database
      const updatedUser = await DeliveryUser.findById(user._id);
      expect(updatedUser.isAvailable).toBe(true);
    });

    it('should update lat, lng, and isAvailable', async () => {
      const user = await DeliveryUser.create({
        email: 'delivery@example.com',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
        isAvailable: false,
      });

      const input = {
        lat: 40.7128,
        lng: -74.006,
        isAvailable: true,
      };

      const response = await request(app)
        .patch('/delivery/status')
        .set('x-user', JSON.stringify({ _id: user._id.toString() }))
        .send(input);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        lat: 40.7128,
        lng: -74.006,
        isAvailable: true,
      });
    });

    it('should return 401 if unauthorized', async () => {
      const response = await request(app)
        .patch('/delivery/status')
        .send({ isAvailable: true });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });

    it('should return 400 if user not found', async () => {
      const response = await request(app)
        .patch('/delivery/status')
        .set('x-user', JSON.stringify({ _id: new mongoose.Types.ObjectId().toString() }))
        .send({ isAvailable: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Delivery user not found');
    });
  });
});