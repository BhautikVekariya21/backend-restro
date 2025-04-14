import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import DeliveryRoute from '../routes/DeliveryRoute.js';
import DeliveryUser from '../models/DeliveryUser.js';
import { generateSalt, generatePassword, validatePassword, generateSignature } from '../utility/PasswordUtility.js';

jest.mock('../utility/PasswordUtility.js', () => ({
  generateSalt: jest.fn(),
  generatePassword: jest.fn(),
  validatePassword: jest.fn(),
  generateSignature: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/delivery', DeliveryRoute);

const mockAuth = (req, res, next) => {
  req.user = req.headers['x-user'] ? JSON.parse(req.headers['x-user']) : null;
  next();
};

app.use('/delivery', (req, res, next) => {
  if (req.path === '/signup' || req.path === '/login') return next();
  mockAuth(req, res, next);
}, DeliveryRoute);

describe('DeliveryController with .select()', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /delivery/signup', () => {
    it('should sign up a delivery user and exclude sensitive fields', async () => {
      generateSalt.mockResolvedValue('salt');
      generatePassword.mockResolvedValue('hashed_password');
      generateSignature.mockResolvedValue('jwt_token');

      const input = {
        email: 'delivery@example.com',
        password: 'password123',
        firstName: 'John',
        phone: '1234567890',
      };

      const response = await request(app).post('/delivery/signup').send(input);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('signature', 'jwt_token');
      expect(response.body).toHaveProperty('email', 'delivery@example.com');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('salt');
      expect(response.body).not.toHaveProperty('__v');
      expect(response.body).not.toHaveProperty('createdAt');
      expect(response.body).not.toHaveProperty('updatedAt');
    });
  });

  describe('POST /delivery/login', () => {
    it('should login and exclude sensitive fields', async () => {
      await DeliveryUser.create({
        email: 'delivery@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });
      validatePassword.mockResolvedValue(true);
      generateSignature.mockResolvedValue('jwt_token');

      const response = await request(app)
        .post('/delivery/login')
        .send({ email: 'delivery@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('signature', 'jwt_token');
      expect(response.body).toHaveProperty('email', 'delivery@example.com');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('salt');
      expect(response.body).not.toHaveProperty('__v');
      expect(response.body).not.toHaveProperty('createdAt');
      expect(response.body).not.toHaveProperty('updatedAt');
    });
  });

  describe('GET /delivery/profile', () => {
    it('should return profile without sensitive fields', async () => {
      const user = await DeliveryUser.create({
        email: 'delivery@example.com',
        firstName: 'John',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
      });

      const response = await request(app)
        .get('/delivery/profile')
        .set('x-user', JSON.stringify({ _id: user._id }));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email', 'delivery@example.com');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('salt');
      expect(response.body).not.toHaveProperty('__v');
      expect(response.body).not.toHaveProperty('createdAt');
      expect(response.body).not.toHaveProperty('updatedAt');
    });
  });
});