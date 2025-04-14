import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import multer from 'multer';
import { diskStorage } from 'multer';
import router from '../routes/vendorRouter'; // Adjust path to your router file
import Vendor from '../models/Vendor.js';
import Food from '../models/Food.js';
import Order from '../models/Order.js';
import Offer from '../models/Offer.js';
import { generateSignature, validatePassword } from '../utility/PasswordUtility.js';
import { FindVendor } from '../controllers/AdminController.js';

// Mock utilities
jest.mock('../utility/PasswordUtility', () => ({
  generateSignature: jest.fn(),
  validatePassword: jest.fn(),
}));

jest.mock('../controllers/AdminController', () => ({
  FindVendor: jest.fn(),
}));

// Multer setup
const storage = diskStorage({
  destination: (req, file, cb) => cb(null, 'images'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage });

// Create Express app
const app = express();
app.use(express.json());
app.use('/vendor', router);

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  req.user = req.headers['x-user'] ? JSON.parse(req.headers['x-user']) : null;
  next();
};

// Override protected routes with mock auth for testing
app.use('/vendor', (req, res, next) => {
  if (req.path === '/login' || req.path === '/') return next();
  mockAuth(req, res, next);
}, router);

describe('VendorController', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    // Create images directory
    require('fs').mkdirSync('images', { recursive: true });
  });

  beforeEach(async () => {
    await Vendor.deleteMany({});
    await Food.deleteMany({});
    await Order.deleteMany({});
    await Offer.deleteMany({});
    jest.clearAllMocks();
    // Clean images directory
    const fs = require('fs');
    fs.readdirSync('images').forEach((file) => fs.unlinkSync(`images/${file}`));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    require('fs').rmdirSync('images', { recursive: true });
  });

  // VendorLogin Tests
  describe('POST /vendor/login', () => {
    it('should login vendor successfully', async () => {
      const vendor = { _id: '123', email: 'vendor@example.com', password: 'hashed', salt: 'salt', name: 'Tasty Bites' };
      FindVendor.mockResolvedValue(vendor);
      validatePassword.mockResolvedValue(true);
      generateSignature.mockResolvedValue('jwt_token');

      const response = await request(app)
        .post('/vendor/login')
        .send({ email: 'vendor@example.com', password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body).toBe('jwt_token');
      expect(generateSignature).toHaveBeenCalledWith({
        _id: '123',
        email: 'vendor@example.com',
        name: 'Tasty Bites',
      });
    });

    it('should return error for invalid credentials', async () => {
      FindVendor.mockResolvedValue(null);

      const response = await request(app)
        .post('/vendor/login')
        .send({ email: 'vendor@example.com', password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Login credential is not valid' });
    });

    it('should return error for wrong password', async () => {
      FindVendor.mockResolvedValue({ _id: '123', email: 'vendor@example.com', password: 'hashed', salt: 'salt' });
      validatePassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/vendor/login')
        .send({ email: 'vendor@example.com', password: 'wrong' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Login credential is not valid' });
    });
  });

  // GetVendorProfile Tests
  describe('GET /vendor/profile', () => {
    it('should return vendor profile', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com', name: 'Tasty Bites' });
      FindVendor.mockResolvedValue(vendor);

      const response = await request(app)
        .get('/vendor/profile')
        .set('x-user', JSON.stringify({ _id: vendor._id }));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ email: 'vendor@example.com', name: 'Tasty Bites' });
    });

    it('should return error if no user', async () => {
      const response = await request(app).get('/vendor/profile');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'vendor Information Not Found' });
    });
  });

  // UpdateVendorProfile Tests
  describe('PATCH /vendor/profile', () => {
    it('should update vendor profile', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com', name: 'Old Name' });
      FindVendor.mockResolvedValue(vendor);

      const response = await request(app)
        .patch('/vendor/profile')
        .set('x-user', JSON.stringify({ _id: vendor._id }))
        .send({ name: 'New Name', address: '123 St', phone: '1234567890', foodType: ['Italian'] });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ name: 'New Name', address: '123 St' });

      const updatedVendor = await Vendor.findById(vendor._id);
      expect(updatedVendor.name).toBe('New Name');
    });

    it('should return error if no user', async () => {
      const response = await request(app).patch('/vendor/profile').send({ name: 'New Name' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to Update vendor profile ' });
    });
  });

  // UpdateVendorCoverImage Tests
  describe('PATCH /vendor/coverimage', () => {
    it('should update cover images', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com', coverImages: ['old.jpg'] });
      FindVendor.mockResolvedValue(vendor);

      const response = await request(app)
        .patch('/vendor/coverimage')
        .set('x-user', JSON.stringify({ _id: vendor._id }))
        .attach('images', Buffer.from('test1'), 'photo1.jpg')
        .attach('images', Buffer.from('test2'), 'photo2.jpg');

      expect(response.status).toBe(200);
      expect(response.body.coverImages).toContain('old.jpg');
      expect(response.body.coverImages).toEqual(
        expect.arrayContaining([expect.stringMatching(/^\d+_photo1\.jpg$/), expect.stringMatching(/^\d+_photo2\.jpg$/)])
      );

      const updatedVendor = await Vendor.findById(vendor._id);
      expect(updatedVendor.coverImages).toHaveLength(3);
    });

    it('should return error if no user', async () => {
      const response = await request(app).patch('/vendor/coverimage');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to Update vendor profile ' });
    });
  });

  // UpdateVendorService Tests
  describe('PATCH /vendor/service', () => {
    it('should toggle service availability', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com', serviceAvailable: false });
      FindVendor.mockResolvedValue(vendor);

      const response = await request(app)
        .patch('/vendor/service')
        .set('x-user', JSON.stringify({ _id: vendor._id }))
        .send({ lat: 10, lng: 20 });

      expect(response.status).toBe(200);
      expect(response.body.serviceAvailable).toBe(true);
      expect(response.body.lat).toBe(10);
      expect(response.body.lng).toBe(20);

      const updatedVendor = await Vendor.findById(vendor._id);
      expect(updatedVendor.serviceAvailable).toBe(true);
    });

    it('should return error if no user', async () => {
      const response = await request(app).patch('/vendor/service');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to Update vendor profile ' });
    });
  });

  // AddFood Tests
  describe('POST /vendor/food', () => {
    it('should add new food', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com', foods: [] });
      FindVendor.mockResolvedValue(vendor);

      const response = await request(app)
        .post('/vendor/food')
        .set('x-user', JSON.stringify({ _id: vendor._id }))
        .attach('images', Buffer.from('test'), 'food.jpg')
        .field('name', 'Pizza')
        .field('description', 'Cheesy pizza')
        .field('category', 'Main')
        .field('foodType', 'Veg')
        .field('readyTime', 30)
        .field('price', 10);

      expect(response.status).toBe(200);
      expect(response.body.foods).toHaveLength(1);

      const food = await Food.findOne({ vendorId: vendor._id });
      expect(food).toMatchObject({ name: 'Pizza', price: 10 });
      expect(food.images).toEqual(expect.arrayContaining([expect.stringMatching(/^\d+_food\.jpg$/)]));
    });

    it('should return error if no user', async () => {
      const response = await request(app).post('/vendor/food').field('name', 'Pizza');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to Update vendor profile ' });
    });
  });

  // GetFoods Tests
  describe('GET /vendor/food', () => {
    it('should return vendor foods', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com' });
      await Food.create([{ vendorId: vendor._id, name: 'Pizza' }, { vendorId: vendor._id, name: 'Burger' }]);

      const response = await request(app)
        .get('/vendor/food')
        .set('x-user', JSON.stringify({ _id: vendor._id }));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'Pizza' }), expect.objectContaining({ name: 'Burger' })])
      );
    });

    it('should return error if no foods', async () => {
      const response = await request(app)
        .get('/vendor/food')
        .set('x-user', JSON.stringify({ _id: '123' }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Foods not found!' });
    });
  });

  // GetCurrentOrders Tests
  describe('GET /vendor/orders', () => {
    it('should return current orders', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com' });
      const food = await Food.create({ name: 'Pizza' });
      await Order.create({ vendorId: vendor._id, items: [{ food: food._id, unit: 1 }] });

      const response = await request(app)
        .get('/vendor/orders')
        .set('x-user', JSON.stringify({ _id: vendor._id }));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].items[0].food).toMatchObject({ name: 'Pizza' });
    });

    it('should return error if no orders', async () => {
      const response = await request(app)
        .get('/vendor/orders')
        .set('x-user', JSON.stringify({ _id: '123' }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Orders Not found' });
    });
  });

  // GetOrderDetails Tests
  describe('GET /vendor/order/:id', () => {
    it('should return order details', async () => {
      const food = await Food.create({ name: 'Pizza' });
      const order = await Order.create({ orderId: 'ORD1', items: [{ food: food._id, unit: 1 }] });

      const response = await request(app).get(`/vendor/order/${order._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ orderId: 'ORD1' });
      expect(response.body.items[0].food).toMatchObject({ name: 'Pizza' });
    });

    it('should return error for invalid order ID', async () => {
      const response = await request(app).get('/vendor/order/invalid_id');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Order Not found' });
    });
  });

  // ProcessOrder Tests
  describe('PUT /vendor/order/:id/process', () => {
    it('should process order', async () => {
      const order = await Order.create({ orderId: 'ORD1', orderStatus: 'pending' });

      const response = await request(app)
        .put(`/vendor/order/${order._id}/process`)
        .send({ status: 'completed', remarks: 'Done', time: 30 });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ orderStatus: 'completed', remarks: 'Done', readyTime: 30 });

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.orderStatus).toBe('completed');
    });

    it('should return error for invalid order ID', async () => {
      const response = await request(app).put('/vendor/order/invalid_id/process').send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to process order' });
    });
  });

  // GetOffers Tests
  describe('GET /vendor/offers', () => {
    it('should return vendor and generic offers', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com' });
      await Offer.create([
        { title: 'Vendor Offer', vendors: [vendor._id], offerType: 'VENDOR' },
        { title: 'Generic Offer', offerType: 'GENERIC' },
      ]);

      const response = await request(app)
        .get('/vendor/offers')
        .set('x-user', JSON.stringify({ _id: vendor._id }));

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Vendor Offer' }),
          expect.objectContaining({ title: 'Generic Offer' }),
        ])
      );
    });

    it('should return empty array if no offers', async () => {
      const response = await request(app)
        .get('/vendor/offers')
        .set('x-user', JSON.stringify({ _id: '123' }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  // AddOffer Tests
  describe('POST /vendor/offer', () => {
    it('should add new offer', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com' });
      FindVendor.mockResolvedValue(vendor);

      const offerInput = {
        title: '10% Off',
        description: 'Discount',
        offerType: 'VENDOR',
        offerAmount: 10,
        pincode: '12345',
        promocode: 'SAVE10',
        promoType: 'user',
        startValidity: '2025-04-01',
        endValidity: '2025-04-30',
        bank: ['HDFC'],
        bins: ['1234'],
        minValue: 100,
        isActive: true,
      };

      const response = await request(app)
        .post('/vendor/offer')
        .set('x-user', JSON.stringify({ _id: vendor._id }))
        .send(offerInput);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ title: '10% Off', vendors: [expect.objectContaining({ email: 'vendor@example.com' })] });

      const offer = await Offer.findOne({ title: '10% Off' });
      expect(offer).toBeTruthy();
    });

    it('should return error if no user', async () => {
      const response = await request(app).post('/vendor/offer').send({ title: '10% Off' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to add Offer!' });
    });
  });

  // EditOffer Tests
  describe('PUT /vendor/offer/:id', () => {
    it('should edit offer successfully', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com' });
      const offer = await Offer.create({ title: 'Old Offer', pincode: '12345' });
      FindVendor.mockResolvedValue(vendor);

      const offerInput = {
        title: 'New Offer',
        description: 'Updated discount',
        offerType: 'VENDOR',
        offerAmount: 15,
        pincode: '67890',
        promocode: 'NEW15',
        promoType: 'user',
        startValidity: '2025-04-01',
        endValidity: '2025-04-30',
        bank: ['ICICI'],
        bins: ['5678'],
        minValue: 200,
        isActive: false,
      };

      const response = await request(app)
        .put(`/vendor/offer/${offer._id}`)
        .set('x-user', JSON.stringify({ _id: vendor._id }))
        .send(offerInput);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ title: 'New Offer', pincode: '67890' });

      const updatedOffer = await Offer.findById(offer._id);
      expect(updatedOffer.title).toBe('New Offer');
    });

    it('should return 404 for invalid offer ID', async () => {
      const vendor = await Vendor.create({ email: 'vendor@example.com' });
      FindVendor.mockResolvedValue(vendor);

      const response = await request(app)
        .put('/vendor/offer/invalid_id')
        .set('x-user', JSON.stringify({ _id: vendor._id }))
        .send({ title: 'New Offer' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Offer Not Found!' });
    });

    it('should return error if no user', async () => {
      const offer = await Offer.create({ title: 'Old Offer' });

      const response = await request(app)
        .put(`/vendor/offer/${offer._id}`)
        .send({ title: 'New Offer' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Unable to add Offer!' });
    });
  });

  // Root Route Test
  describe('GET /vendor/', () => {
    it('should return welcome message', async () => {
      const response = await request(app).get('/vendor/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Hello from Vandor' });
    });
  });
});