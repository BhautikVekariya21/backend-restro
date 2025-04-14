import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ShoppingRoute from '../routes/ShoppingRoute.js';
import Vendor from '../models/Vendor.js';
import Food from '../models/Food.js';
import Offer from '../models/Offer.js';

// Create Express app
const app = express();
app.use(express.json());
app.use('/shopping', ShoppingRoute);

describe('ShoppingController', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /shopping/:pincode', () => {
    it('should return food availability for pincode', async () => {
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
      });
      await Food.create({ name: 'Pizza', vendorId: vendor._id });

      const response = await request(app).get('/shopping/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ name: 'Tasty Bites' });
    });

    it('should return empty array if no vendors available', async () => {
      const response = await request(app).get('/shopping/67890');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /shopping/top-restaurant/:pincode', () => {
    it('should return top restaurants for pincode', async () => {
      await Vendor.create([
        { name: 'Top Eats', pincode: '12345', serviceAvailable: true, rating: 4.5 },
        { name: 'Low Eats', pincode: '12345', serviceAvailable: true, rating: 3.0 },
      ]);

      const response = await request(app).get('/shopping/top-restaurant/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ name: 'Top Eats' });
    });

    it('should return empty array if no top restaurants', async () => {
      const response = await request(app).get('/shopping/top-restaurant/67890');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /shopping/foods-in-30-min/:pincode', () => {
    it('should return foods available in 30 minutes', async () => {
      const vendor = await Vendor.create({
        name: 'Quick Bites',
        pincode: '12345',
        serviceAvailable: true,
      });
      await Food.create({ name: 'Burger', vendorId: vendor._id, readyTime: 25 });

      const response = await request(app).get('/shopping/foods-in-30-min/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ name: 'Burger' });
    });

    it('should return empty array if no fast foods', async () => {
      const response = await request(app).get('/shopping/foods-in-30-min/67890');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /shopping/search/:pincode', () => {
    it('should search foods by pincode', async () => {
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
      });
      await Food.create({ name: 'Pizza', vendorId: vendor._id });

      const response = await request(app).get('/shopping/search/12345').query({ query: 'Pizza' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ name: 'Pizza' });
    });

    it('should return empty array if no matches', async () => {
      const response = await request(app).get('/shopping/search/12345').query({ query: 'Sushi' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /shopping/offers/:pincode', () => {
    it('should return available offers for pincode', async () => {
      await Offer.create({ title: '10% Off', pincode: '12345', isActive: true });

      const response = await request(app).get('/shopping/offers/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ title: '10% Off' });
    });

    it('should return empty array if no offers', async () => {
      const response = await request(app).get('/shopping/offers/67890');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /shopping/restaurant/:id', () => {
    it('should return restaurant by ID', async () => {
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
      });

      const response = await request(app).get(`/shopping/restaurant/${vendor._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ name: 'Tasty Bites' });
    });

    it('should return 400 for invalid ID', async () => {
      const response = await request(app).get('/shopping/restaurant/invalid_id');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ message: 'Invalid restaurant ID' });
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app).get(`/shopping/restaurant/${new mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ message: 'Restaurant not found' });
    });
  });
});