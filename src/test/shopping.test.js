import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import router from '../routes/foodRouter.js'; // Adjust path to your router file
import Food from '../models/Food.js'; // Adjust path to your Food model
import Vendor from '../models/Vendor.js'; // Adjust path to your Vendor model
import Offer from '../models/Offer.js'; // Adjust path to your Offer model

// Create Express app
const app = express();
app.use(express.json());
app.use('/food', router);

describe('Food Controller', () => {
  let mongoServer;

  // Setup MongoDB in-memory server before all tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Clear database before each test
  beforeEach(async () => {
    await Vendor.deleteMany({});
    await Food.deleteMany({});
    await Offer.deleteMany({});
  });

  // Disconnect and stop server after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // GetFoodAvailability Tests
  describe('GET /food/:pincode', () => {
    it('should return vendors for valid pincode', async () => {
      const food1 = await Food.create({ name: 'Pizza', price: 10 });
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.8,
        foods: [food1._id],
      });

      const response = await request(app).get('/food/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        name: 'Tasty Bites',
        pincode: '12345',
        rating: 4.8,
        foods: expect.arrayContaining([expect.objectContaining({ name: 'Pizza' })]),
      });
    });

    it('should return 404 if no vendors found', async () => {
      const response = await request(app).get('/food/99999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });

    it('should exclude vendors with serviceAvailable false', async () => {
      await Vendor.create({
        name: 'Closed Cafe',
        pincode: '12345',
        serviceAvailable: false,
        rating: 4.0,
        foods: [],
      });

      const response = await request(app).get('/food/12345');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });

    it('should sort vendors by rating descending', async () => {
      const food = await Food.create({ name: 'Pizza', price: 10 });
      await Vendor.create([
        {
          name: 'Tasty Bites',
          pincode: '12345',
          serviceAvailable: true,
          rating: 4.8,
          foods: [food._id],
        },
        {
          name: 'Quick Eats',
          pincode: '12345',
          serviceAvailable: true,
          rating: 4.5,
          foods: [food._id],
        },
      ]);

      const response = await request(app).get('/food/12345');

      expect(response.status).toBe(200);
      expect(response.body[0].name).toBe('Tasty Bites');
      expect(response.body[1].name).toBe('Quick Eats');
    });

    it('should handle invalid pincode format', async () => {
      const response = await request(app).get('/food/abc');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });
  });

  // GetTopRestaurants Tests
  describe('GET /food/top-restaurant/:pincode', () => {
    it('should return up to 10 vendors sorted by rating', async () => {
      await Vendor.create([
        { name: 'Vendor1', pincode: '12345', serviceAvailable: true, rating: 4.8 },
        { name: 'Vendor2', pincode: '12345', serviceAvailable: true, rating: 4.5 },
        { name: 'Vendor3', pincode: '12345', serviceAvailable: true, rating: 4.2 },
      ]);

      const response = await request(app).get('/food/top-restaurant/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].rating).toBe(4.8);
      expect(response.body[1].rating).toBe(4.5);
      expect(response.body[2].rating).toBe(4.2);
    });

    it('should limit to 10 vendors', async () => {
      const vendors = Array.from({ length: 12 }, (_, i) => ({
        name: `Vendor${i}`,
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.0 - i * 0.1,
      }));
      await Vendor.insertMany(vendors);

      const response = await request(app).get('/food/top-restaurant/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(10);
    });

    it('should return 404 if no vendors found', async () => {
      const response = await request(app).get('/food/top-restaurant/99999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });

    it('should exclude unavailable vendors', async () => {
      await Vendor.create({
        name: 'Closed Cafe',
        pincode: '12345',
        serviceAvailable: false,
        rating: 4.0,
      });

      const response = await request(app).get('/food/top-restaurant/12345');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });
  });

  // GetFoodsIn30Min Tests
  describe('GET /food/foods-in-30-min/:pincode', () => {
    it('should return foods with readyTime <= 30', async () => {
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.8,
        foods: [],
      });
      const food1 = await Food.create({
        name: 'Burger',
        price: 8,
        readyTime: 20,
        vendorId: vendor._id,
      });
      const food2 = await Food.create({
        name: 'Pizza',
        price: 10,
        readyTime: 40,
        vendorId: vendor._id,
      });
      await Vendor.findByIdAndUpdate(vendor._id, { foods: [food1._id, food2._id] });

      const response = await request(app).get('/food/foods-in-30-min/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({ name: 'Burger', readyTime: 20 });
    });

    it('should return 404 if no vendors found', async () => {
      const response = await request(app).get('/food/foods-in-30-min/99999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });

    it('should return 404 if no foods have readyTime <= 30', async () => {
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.8,
        foods: [],
      });
      const food = await Food.create({
        name: 'Pizza',
        price: 10,
        readyTime: 40,
        vendorId: vendor._id,
      });
      await Vendor.findByIdAndUpdate(vendor._id, { foods: [food._id] });

      const response = await request(app).get('/food/foods-in-30-min/12345');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });

    it('should sort foods by vendor rating', async () => {
      const vendor1 = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.8,
        foods: [],
      });
      const vendor2 = await Vendor.create({
        name: 'Quick Eats',
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.5,
        foods: [],
      });
      const food1 = await Food.create({
        name: 'Burger',
        price: 8,
        readyTime: 20,
        vendorId: vendor1._id,
      });
      const food2 = await Food.create({
        name: 'Salad',
        price: 6,
        readyTime: 15,
        vendorId: vendor2._id,
      });
      await Vendor.findByIdAndUpdate(vendor1._id, { foods: [food1._id] });
      await Vendor.findByIdAndUpdate(vendor2._id, { foods: [food2._id] });

      const response = await request(app).get('/food/foods-in-30-min/12345');

      expect(response.status).toBe(200);
      expect(response.body[0].name).toBe('Burger');
      expect(response.body[1].name).toBe('Salad');
    });
  });

  // SearchFoods Tests
  describe('GET /food/search/:pincode', () => {
    it('should return all foods for valid pincode', async () => {
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.8,
        foods: [],
      });
      const food1 = await Food.create({
        name: 'Burger',
        price: 8,
        readyTime: 20,
        vendorId: vendor._id,
      });
      const food2 = await Food.create({
        name: 'Pizza',
        price: 10,
        readyTime: 40,
        vendorId: vendor._id,
      });
      await Vendor.findByIdAndUpdate(vendor._id, { foods: [food1._id, food2._id] });

      const response = await request(app).get('/food/search/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Burger' }),
          expect.objectContaining({ name: 'Pizza' }),
        ])
      );
    });

    it('should return 404 if no vendors found', async () => {
      const response = await request(app).get('/food/search/99999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });

    it('should return empty array if vendors have no foods', async () => {
      await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.8,
        foods: [],
      });

      const response = await request(app).get('/food/search/12345');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  // RestaurantById Tests
  describe('GET /food/restaurant/:id', () => {
    it('should return vendor by ID', async () => {
      const food = await Food.create({ name: 'Pizza', price: 10 });
      const vendor = await Vendor.create({
        name: 'Tasty Bites',
        pincode: '12345',
        serviceAvailable: true,
        rating: 4.8,
        foods: [food._id],
      });

      const response = await request(app).get(`/food/restaurant/${vendor._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Tasty Bites',
        foods: expect.arrayContaining([expect.objectContaining({ name: 'Pizza' })]),
      });
    });

    it('should return 404 for invalid ID', async () => {
      const response = await request(app).get(
        `/food/restaurant/${new mongoose.Types.ObjectId()}`
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });

    it('should return 404 for malformed ID', async () => {
      const response = await request(app).get('/food/restaurant/invalid_id');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ msg: 'data Not found!' });
    });
  });

  // GetAvailableOffers Tests
  describe('GET /food/offers/:pincode', () => {
    it('should return active offers for pincode', async () => {
      await Offer.create([
        { title: '10% Off', pincode: '12345', isActive: true },
        { title: 'Free Delivery', pincode: '12345', isActive: true },
        { title: 'Old Offer', pincode: '12345', isActive: false },
      ]);

      const response = await request(app).get('/food/offers/12345');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: '10% Off', isActive: true }),
          expect.objectContaining({ title: 'Free Delivery', isActive: true }),
        ])
      );
    });

    it('should return empty array if no active offers', async () => {
      await Offer.create([
        { title: 'Old Offer', pincode: '12345', isActive: false },
      ]);

      const response = await request(app).get('/food/offers/12345');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return empty array for invalid pincode', async () => {
      const response = await request(app).get('/food/offers/99999');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});