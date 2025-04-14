// src/routes/CustomerRoute.js
import { Router } from 'express';
import {
  CustomerSignUp,
  CustomerLogin,
  CustomerVerify,
  RequestOtp,
  GetCustomerProfile,
  EditCustomerProfile,
  CreateOrder,
  GetOrders,
  GetOrderById,
  AddToCart,
  GetCart,
  DeleteCart,
  VerifyOffer,
  CreatePayment,
} from '../controllers/CustomerController.js';
import { validateSignature } from '../utility/PasswordUnility.js';
// src/routes/CustomerRoute.js

const router = Router();

router.post('/signup', (req, res, next) => {
  console.log('POST /customer/signup called');
  CustomerSignUp(req, res, next);
});

router.post('/login', (req, res, next) => {
  console.log('POST /customer/login called');
  CustomerLogin(req, res, next);
});

router.patch('/verify', validateSignature, (req, res, next) => {
  console.log('PATCH /customer/verify called');
  CustomerVerify(req, res, next);
});

router.get('/otp', validateSignature, (req, res, next) => {
  console.log('GET /customer/otp called');
  RequestOtp(req, res, next);
});

router.get('/profile', validateSignature, (req, res, next) => {
  console.log('GET /customer/profile called');
  GetCustomerProfile(req, res, next);
});

router.patch('/profile', validateSignature, (req, res, next) => {
  console.log('PATCH /customer/profile called');
  EditCustomerProfile(req, res, next);
});

router.post('/create-order', validateSignature, (req, res, next) => {
  console.log('POST /customer/create-order called');
  CreateOrder(req, res, next);
});

router.get('/orders', validateSignature, (req, res, next) => {
  console.log('GET /customer/orders called');
  GetOrders(req, res, next);
});

router.get('/order/:id', validateSignature, (req, res, next) => {
  console.log('GET /customer/order/:id called');
  GetOrderById(req, res, next);
});

router.put('/cart', validateSignature, (req, res, next) => {
  console.log('PUT /customer/cart called');
  AddToCart(req, res, next);
});

router.get('/cart', validateSignature, (req, res, next) => {
  console.log('GET /customer/cart called');
  GetCart(req, res, next);
});

router.delete('/cart', validateSignature, (req, res, next) => {
  console.log('DELETE /customer/cart called');
  DeleteCart(req, res, next);
});

router.get('/offer/verify/:id', validateSignature, (req, res, next) => {
  console.log('GET /customer/offer/verify/:id called');
  VerifyOffer(req, res, next);
});

router.post('/create-payment', validateSignature, (req, res, next) => {
  console.log('POST /customer/create-payment called');
  CreatePayment(req, res, next);
});

export default router;