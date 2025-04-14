import request from 'supertest';
import express, { json } from 'express';
import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { CustomerSignUp, CustomerLogin, CustomerVerify, RequestOtp, GetCustomerProfile, EditCustomerProfile, CreateOrder, GetOrders, GetOrderById, AddToCart, GetCart, DeleteCart, VerifyOffer, CreatePayment } from '../controllers/CustomerController.js';
import { generateOtp } from '../utility/NotificationUtility.js';
import { generateSalt } from '../utility/PasswordUtility.js';
import { generatePassword } from '../utility/PasswordUtility.js';
import { validatePassword } from '../utility/PasswordUtility.js';
import { generateSignature } from '../utility/PasswordUtility.js';
import { sendOtp } from '../utility/NotificationUtility.js';
import Food from '../models/Food.js';
import Vendor from '../models/Vendor.js';
import Order from '../models/Order.js';
import Offer from '../models/Offer.js';
import Transaction from '../models/Transaction.js';

// Mock utility functions
jest.mock('../utility', () => ({
  generateSalt: jest.fn(),
  generatePassword: jest.fn(),
  validatePassword: jest.fn(),
  generateSignature: jest.fn(),
  generateOtp: jest.fn(),
  sendOtp: jest.fn(),
}));

// Setup Express app for testing
const app = express();
app.use(json());

// Mock middleware to set req.user
const mockAuthMiddleware = (req, res, next) => {
  req.user = req.user || null;
  next();
};

// Routes
app.post('/customer/signup', CustomerSignUp);
app.post('/customer/login', CustomerLogin);
app.post('/customer/verify', mockAuthMiddleware, CustomerVerify);
app.post('/customer/otp', mockAuthMiddleware, RequestOtp);
app.get('/customer/profile', mockAuthMiddleware, GetCustomerProfile);
app.put('/customer/profile', mockAuthMiddleware, EditCustomerProfile);
app.post('/customer/order', mockAuthMiddleware, CreateOrder);
app.get('/customer/orders', mockAuthMiddleware, GetOrders);
app.get('/customer/order/:id', GetOrderById);
app.post('/customer/cart', mockAuthMiddleware, AddToCart);
app.get('/customer/cart', mockAuthMiddleware, GetCart);
app.delete('/customer/cart', mockAuthMiddleware, DeleteCart);
app.get('/customer/offer/:id', mockAuthMiddleware, VerifyOffer);
app.post('/customer/payment', mockAuthMiddleware, CreatePayment);

describe('Customer Controller', () => {
  beforeEach(async () => {
    // Clear mocks
    jest.clearAllMocks();
    // Mock utility functions
    generateSalt.mockResolvedValue('salt');
    generatePassword.mockResolvedValue('hashedPassword');
    validatePassword.mockResolvedValue(true);
    generateSignature.mockResolvedValue('jwt_token');
    generateOtp.mockReturnValue({ otp: 123456, expiry: new Date(Date.now() + 10 * 60 * 1000) });
    sendOtp.mockResolvedValue(true);
  });

  describe('CustomerSignUp', () => {
    it('should create a new customer and return signature', async () => {
      const input = {
        email: 'test@example.com',
        phone: '1234567890',
        password: 'secure123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app).post('/customer/signup').send(input);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        signature: 'jwt_token',
        verified: false,
        email: 'test@example.com',
      });
      expect(generateSalt).toHaveBeenCalled();
      expect(generatePassword).toHaveBeenCalledWith('secure123', 'salt');
      expect(generateOtp).toHaveBeenCalled();
      expect(sendOtp).toHaveBeenCalledWith(123456, '1234567890');
      expect(generateSignature).toHaveBeenCalledWith({
        _id: expect.any(String),
        email: 'test@example.com',
        verified: false,
      });

      const customer = await Customer.findOne({ email: 'test@example.com' });
      expect(customer).toBeTruthy();
      expect(customer.phone).toBe('1234567890');
      expect(customer.verified).toBe(false);
    });

    it('should return 400 if email already exists', async () => {
      await Customer.create({
        email: 'test@example.com',
        phone: '1234567890',
        password: 'hashed',
        salt: 'salt',
        verified: false,
      });

      const input = {
        email: 'test@example.com',
        phone: '0987654321',
        password: 'secure123',
      };

      const response = await request(app).post('/customer/signup').send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email already exists!');
    });

    it('should return 400 for invalid input (schema validation)', async () => {
      const input = {
        email: 'invalid',
        phone: '123',
        password: 'short',
      };

      const response = await request(app).post('/customer/signup').send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('Please provide a valid email address');
      expect(response.body.errors).toContain('Phone number must be 7 to 12 digits');
      expect(response.body.errors).toContain('Password must be at least 6 characters');
    });
  });

  describe('CustomerLogin', () => {
    it('should login customer and return signature', async () => {
      await Customer.create({
        email: 'test@example.com',
        password: 'hashedPassword',
        salt: 'salt',
        phone: '1234567890',
        verified: true,
      });

      const input = {
        email: 'test@example.com',
        password: 'secure123',
      };

      const response = await request(app).post('/customer/login').send(input);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        signature: 'jwt_token',
        email: 'test@example.com',
        verified: true,
      });
      expect(validatePassword).toHaveBeenCalledWith('secure123', 'hashedPassword', 'salt');
      expect(generateSignature).toHaveBeenCalledWith({
        _id: expect.any(String),
        email: 'test@example.com',
        verified: true,
      });
    });

    it('should return 400 for invalid email or password', async () => {
      const input = {
        email: 'wrong@example.com',
        password: 'secure123',
      };

      const response = await request(app).post('/customer/login').send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 400 if password validation fails', async () => {
      await Customer.create({
        email: 'test@example.com',
        password: 'hashedPassword',
        salt: 'salt',
        phone: '1234567890',
      });

      validatePassword.mockResolvedValue(false);

      const input = {
        email: 'test@example.com',
        password: 'wrong',
      };

      const response = await request(app).post('/customer/login').send(input);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('CustomerVerify', () => {
    it('should verify customer with valid OTP', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
        otp: 123456,
        otp_expiry: new Date(Date.now() + 10 * 60 * 1000),
        verified: false,
      });

      const input = { otp: '123456' };
      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .post('/customer/verify')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        signature: 'jwt_token',
        email: 'test@example.com',
        verified: true,
      });

      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.verified).toBe(true);
    });

    it('should return 400 for invalid OTP', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
        otp: 123456,
        otp_expiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      const input = { otp: '999999' };
      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .post('/customer/verify')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired OTP');
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app).post('/customer/verify').send({ otp: '123456' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('RequestOtp', () => {
    it('should send new OTP to customer', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
        verified: false,
      });

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .post('/customer/otp')
        .send({})
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP sent to your registered mobile number!');
      expect(generateOtp).toHaveBeenCalled();
      expect(sendOtp).toHaveBeenCalledWith(123456, '1234567890');

      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.otp).toBe(123456);
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app).post('/customer/otp').send({});

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('GetCustomerProfile', () => {
    it('should return customer profile', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
        firstName: 'John',
      });

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .get('/customer/profile')
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.firstName).toBe('John');
      expect(response.body.password).toBeUndefined();
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app).get('/customer/profile');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('EditCustomerProfile', () => {
    it('should update customer profile', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const input = {
        firstName: 'Jane',
        lastName: 'Doe',
        address: '123 Main St',
        pincode: '12345',
      };

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .put('/customer/profile')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe('Jane');
      expect(response.body.lastName).toBe('Doe');
      expect(response.body.address).toBe('123 Main St');
      expect(response.body.pincode).toBe('12345');
    });

    it('should return 400 for invalid input', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const input = {
        firstName: 'Jo',
        address: '123',
      };

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .put('/customer/profile')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('First name must be at least 3 characters');
      expect(response.body.errors).toContain('Address must be at least 6 characters');
    });
  });

  describe('CreateOrder', () => {
    it('should create a new order', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const vendor = await Vendor.create({ name: 'Vendor', pincode: '12345', lat: 0, lng: 0 });
      const food = await Food.create({ name: 'Pizza', price: 10, vendorId: vendor._id });
      const transaction = await Transaction.create({
        customer: customer._id,
        status: 'OPEN',
      });

      const input = {
        txnId: transaction._id,
        amount: 20,
        items: [{ _id: food._id.toString(), unit: 2 }],
      };

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .post('/customer/order')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);

      const order = await Order.findOne({ orderId: expect.any(String) });
      expect(order.totalAmount).toBe(20);
      expect(order.items).toEqual([{ food_id: food._id, unit: 2 }]);
    });

    it('should return 400 for invalid transaction', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const input = {
        txnId: new Types.ObjectId(),
        amount: 20,
        items: [{ _id: new Types.ObjectId().toString(), unit: 2 }],
      };

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .post('/customer/order')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid transaction');
    });
  });

  describe('GetOrders', () => {
    it('should return customer orders', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const order = await Order.create({ orderId: '1234', items: [] });
      await Customer.updateOne({ _id: customer._id }, { $push: { orders: order._id } });

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .get('/customer/orders')
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].orderId).toBe('1234');
    });
  });

  describe('GetOrderById', () => {
    it('should return order by ID', async () => {
      const food = await Food.create({ name: 'Pizza', price: 10 });
      const order = await Order.create({
        orderId: '1234',
        items: [{ food_id: food._id, unit: 1 }],
      });

      const response = await request(app).get(`/customer/order/${order._id}`);

      expect(response.status).toBe(200);
      expect(response.body.orderId).toBe('1234');
      expect(response.body.items[0].food.name).toBe('Pizza');
    });

    it('should return 400 if order not found', async () => {
      const response = await request(app).get(`/customer/order/${new Types.ObjectId()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Order not found');
    });
  });

  describe('AddToCart', () => {
    it('should add item to cart', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const food = await Food.create({ name: 'Pizza', price: 10 });

      const input = { _id: food._id.toString(), unit: 2 };
      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .post('/customer/cart')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ food: food._id.toString(), unit: 2 }]);

      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.cart).toEqual([{ food: food._id, unit: 2 }]);
    });

    it('should update existing item in cart', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
        cart: [{ food: new Types.ObjectId(), unit: 1 }],
      });

      const food = await Food.create({ name: 'Pizza', price: 10 });

      const input = { _id: food._id.toString(), unit: 3 };
      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .post('/customer/cart')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body).toContainEqual({ food: food._id.toString(), unit: 3 });
    });
  });

  describe('GetCart', () => {
    it('should return customer cart', async () => {
      const food = await Food.create({ name: 'Pizza', price: 10 });
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
        cart: [{ food: food._id, unit: 2 }],
      });

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .get('/customer/cart')
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body[0].food.name).toBe('Pizza');
      expect(response.body[0].unit).toBe(2);
    });
  });

  describe('DeleteCart', () => {
    it('should clear customer cart', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
        cart: [{ food: new Types.ObjectId(), unit: 2 }],
      });

      const voel = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .delete('/customer/cart')
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);

      const updatedCustomer = await Customer.findById(customer._id);
      expect(updatedCustomer.cart).toEqual([]);
    });
  });

  describe('VerifyOffer', () => {
    it('should verify active offer', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const offer = await Offer.create({ offerAmount: 5, isActive: true });

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .get(`/customer/offer/${offer._id}`)
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Offer is valid');
      expect(response.body.offer.offerAmount).toBe(5);
    });

    it('should return 400 for inactive offer', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const offer = await Offer.create({ offerAmount: 5, isActive: false });

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .get(`/customer/offer/${offer._id}`)
        .set('req', { user: req.user });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Offer is not valid');
    });
  });

  describe('CreatePayment', () => {
    it('should create payment transaction', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const input = {
        amount: 100,
        paymentMode: 'CASH',
        offerId: null,
      };

      const req = { user: { _id: customer._id, email: customer.email } };

      const response = await request(app)
        .post('/customer/payment')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body.orderValue).toBe(100);
      expect(response.body.paymentMode).toBe('CASH');
      expect(response.body.status).toBe('OPEN');
    });

    it('should apply offer to payment', async () => {
      const customer = await Customer.create({
        email: 'test@example.com',
        password: 'hashed',
        salt: 'salt',
        phone: '1234567890',
      });

      const offer = await Offer.create({ offerAmount: 20, isActive: true });

      const input = {
        amount: 100,
        paymentMode: 'CASH',
        offerId: offer._id,
      };

      const req = { user: { _id: asiakkaan._id, email: asiakkaan.email } };

      const response = await request(app)
        .post('/customer/payment')
        .send(input)
        .set('req', { user: req.user });

      expect(response.status).toBe(200);
      expect(response.body.orderValue).toBe(80);
      expect(response.body.offerUsed).toBe(offer._id.toString());
    });
  });
});