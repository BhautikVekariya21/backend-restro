import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Food from '../models/Food.js';
import Offer from '../models/Offer.js';
import Order from '../models/Order.js';
import Transaction from '../models/Transaction.js';
import { generatePassword } from '../utility/PasswordUnility.js'
import { generateSignature } from '../utility/PasswordUnility.js'
import { validatePassword } from '../utility/PasswordUnility.js';
import { sendOtp } from '../utility/NotificationUtility.js';
import { verifyOtp } from '../utility/NotificationUtility.js';
import { generateOrderId } from '../utility/OrderUtility.js';
import { assignOrderForDelivery } from '../utility/OrderUtility.js';

// src/controllers/CustomerController.js

export const CustomerSignUp = async (req, res) => {
  const { email, phone, password, firstName, lastName, address, pincode } = req.body;

  try {
    console.log(`Attempting signup for email: ${email}`);
    console.log(`Raw password: "${password}", length: ${password ? password.length : 'undefined'}`);

    // Validate password length manually before hashing
    if (!password) {
      console.log('Password is missing');
      return res.status(400).json({ message: 'Password is required' });
    }
    if (password.length < 6) {
      console.log(`Password too short: ${password.length} characters`);
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (password.length > 12) {
      console.log(`Password too long: ${password.length} characters`);
      return res.status(400).json({ message: 'Password must not exceed 12 characters' });
    }

    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      console.log(`Email ${email} already exists`);
      return res.status(400).json({ message: 'Email already exists!' });
    }

    const userPassword = await generatePassword(password);
    console.log(`Creating new customer for ${email}`);
    const result = await Customer.create({
      email,
      password: userPassword,
      phone,
      firstName: firstName || '',
      lastName: lastName || '',
      address: address || '',
      pincode: pincode || '',
      verified: false,
      lat: 0,
      lng: 0,
      orders: [],
    });

    console.log(`Sending OTP to ${phone} for signup`);
    const otpResult = await sendOtp(phone);
    if (!otpResult.success) {
      console.error(`Failed to send OTP to ${phone}: ${otpResult.error}`);
      return res.status(400).json({ message: 'Failed to send OTP', error: otpResult.error });
    }

    const token = await generateSignature({
      _id: result._id,
      email: result.email,
      verified: result.verified,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    const userResponse = await Customer.findById(result._id).select('-password -__v -createdAt -updatedAt');
    console.log(`Signup successful for ${email}`);
    return res.status(201).json(userResponse.toObject());
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      console.error(`Validation error during signup: ${errors.join(', ')}`);
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    console.error(`Error during signup: ${error.message}`);
    return res.status(400).json({ message: 'Error while creating user', error: error.message });
  }
};

export const CustomerLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`Attempting login for email: ${email}`);
    const customer = await Customer.findOne({ email }).select('+password');
    if (!customer) {
      console.log(`No customer found for email: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isValid = await validatePassword(password, customer.password);
    if (!isValid) {
      console.log(`Invalid password for email: ${email}`);
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = await generateSignature({
      _id: customer._id,
      email: customer.email,
      verified: customer.verified,
    });

    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    const userResponse = await Customer.findById(customer._id).select('-password -__v -createdAt -updatedAt');
    console.log(`Login successful for ${email}`);
    return res.status(200).json(userResponse.toObject());
  } catch (error) {
    console.error(`Error during login: ${error.message}`);
    return res.status(400).json({ message: 'Error during login', error: error.message });
  }
};

export const CustomerVerify = async (req, res) => {
  const { otp } = req.body;
  const customer = req.user;

  try {
    console.log('CustomerVerify called with req.user:', customer);
    if (!customer || !customer._id) {
      console.log('No authenticated customer found or invalid req.user');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id);
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    console.log(`Verifying OTP for phone: ${profile.phone}`);
    const verifyResult = await verifyOtp(profile.phone, otp);
    if (!verifyResult.success) {
      console.log(`Invalid OTP for phone: ${profile.phone}`);
      return res.status(400).json({ message: 'Invalid OTP', error: verifyResult.error });
    }

    profile.verified = true;
    await profile.save();
    console.log(`Customer verified successfully for ID: ${customer._id}`);

    const token = await generateSignature({
      _id: profile._id,
      email: profile.email,
      verified: profile.verified,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    const userResponse = await Customer.findById(profile._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(userResponse.toObject());
  } catch (error) {
    console.error(`Error verifying customer: ${error.message}`, error);
    return res.status(400).json({ message: 'Unable to verify customer', error: error.message });
  }
};

export const RequestOtp = async (req, res) => {
  const customer = req.user;

  try {
    console.log('RequestOtp called with req.user:', customer);
    if (!customer || !customer._id) {
      console.log('No authenticated customer found or invalid req.user');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id);
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    console.log(`Requesting new OTP for phone: ${profile.phone}`);
    const otpResult = await sendOtp(profile.phone);
    if (!otpResult.success) {
      console.error(`Failed to send OTP to ${profile.phone}: ${otpResult.error}`);
      return res.status(400).json({ message: 'Failed to send OTP', error: otpResult.error });
    }

    console.log(`OTP sent successfully to ${profile.phone}`);
    return res.status(200).json({ message: 'OTP sent to your registered mobile number!' });
  } catch (error) {
    console.error(`Error requesting OTP: ${error.message}`, error);
    return res.status(400).json({ message: 'Error requesting OTP', error: error.message });
  }
};

export const GetCustomerProfile = async (req, res) => {
  const customer = req.user;

  try {
    console.log('GetCustomerProfile called with req.user:', customer);
    if (!customer || !customer._id) {
      console.log('No authenticated customer found or invalid req.user');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id).select('-password -__v -createdAt -updatedAt');
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error(`Error fetching profile: ${error.message}`, error);
    return res.status(400).json({ message: 'Error fetching profile', error: error.message });
  }
};

export const EditCustomerProfile = async (req, res) => {
  const customer = req.user;
  const { firstName, lastName, address, pincode } = req.body;

  try {
    console.log('EditCustomerProfile called with req.user:', customer);
    if (!customer || !customer._id) {
      console.log('No authenticated customer found or invalid req.user');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id);
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    if (firstName !== undefined) profile.firstName = firstName;
    if (lastName !== undefined) profile.lastName = lastName;
    if (address !== undefined) profile.address = address;
    if (pincode !== undefined) profile.pincode = pincode;

    await profile.save();
    console.log(`Profile updated for customer ID: ${customer._id}`);

    const userResponse = await Customer.findById(profile._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(userResponse);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      console.error(`Validation error updating profile: ${errors.join(', ')}`);
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    console.error(`Error updating profile: ${error.message}`, error);
    return res.status(400).json({ message: 'Error updating profile', error: error.message });
  }
};

const validateTransaction = async (txnId) => {
  try {
    console.log(`Validating transaction ${txnId}`);
    const currentTransaction = await Transaction.findOne({ _id: txnId });
    if (currentTransaction && currentTransaction.status.toLowerCase() !== 'failed') {
      console.log(`Transaction ${txnId} is valid`);
      return { status: true, currentTransaction };
    }
    console.log(`Transaction ${txnId} is invalid or failed`);
    return { status: false, currentTransaction };
  } catch (error) {
    console.error(`Error validating transaction ${txnId}: ${error.message}`);
    return { status: false, currentTransaction: null };
  }
};

export const CreateOrder = async (req, res) => {
  const customer = req.user;

  try {
    if (!customer || !customer._id) {
      console.log('No authenticated customer found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { txnId, amount, items } = req.body;
    console.log(`Validating transaction ${txnId}`);
    const { status, currentTransaction } = await validateTransaction(txnId);
    if (!status) {
      console.log(`Invalid transaction ${txnId}`);
      return res.status(400).json({ message: 'Invalid transaction' });
    }

    console.log(`Fetching profile for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id);
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    console.log('Fetching foods for order creation', { foodIds: items.map((item) => item._id) });
    const foodIds = items.map((item) => new mongoose.Types.ObjectId(item._id));
    const foods = await Food.find({ _id: { $in: foodIds } });
    console.log('Foods found:', foods.map((f) => ({ _id: f._id.toString(), name: f.name })));

    if (foods.length !== items.length) {
      console.log('Some food items not found', { requested: foodIds.map(id => id.toString()), found: foods.map((f) => f._id.toString()) });
      return res.status(400).json({ message: 'Invalid food items' });
    }

    const orderId = await generateOrderId();
    console.log(`Creating order ${orderId}`);

    const orderItems = items.map((item) => {
      const food = foods.find((f) => f._id.toString() === item._id);
      if (!food) {
        console.log(`Food not found for item._id: ${item._id}`);
        throw new Error(`Food not found for ID: ${item._id}`);
      }
      return {
        food: food._id,
        unit: item.unit
      };
    });
    console.log('Order items:', orderItems);

    const order = new Order({
      orderId,
      vendorId: foods[0].vendorId.toString(),
      items: orderItems,
      totalAmount: amount,
      paidAmount: amount,
      orderStatus: 'Waiting',
      readyTime: 45
    });

    const orderResult = await order.save();
    console.log(`Order created: ${orderResult._id}`);

    currentTransaction.orderId = orderResult._id.toString();
    await currentTransaction.save();

    console.log(`Assigning delivery for order ${orderId}`);
    await assignOrderForDelivery(orderResult._id, foods[0].vendorId);

    profile.orders.push(orderResult._id);
    await profile.save();
    console.log(`Order added to customer profile: ${customer._id}`);

    const userResponse = await Customer.findById(customer._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(userResponse);
  } catch (error) {
    console.error(`Error creating order: ${error.message}`);
    return res.status(400).json({ message: 'Error creating order', error: error.message });
  }
};

export const GetOrders = async (req, res) => {
  const customer = req.user;
  try {
    if (!customer) {
      console.log('No authenticated customer found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching orders for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id)
      .populate('orders')
      .select('-password -__v -createdAt -updatedAt');
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    return res.status(200).json(profile.orders);
  } catch (error) {
    console.error(`Error fetching orders: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching orders', error: error.message });
  }
};

export const GetOrderById = async (req, res) => {
  const orderId = req.params.id;
  try {
    console.log(`Fetching order by orderId ${orderId}`);
    const order = await Order.findOne({ orderId }).populate('items.food');
    if (!order) {
      console.log(`Order not found for orderId: ${orderId}`);
      return res.status(404).json({ message: 'Order not found' });
    }
    return res.status(200).json(order);
  } catch (error) {
    console.error(`Error fetching order ${orderId}: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching order', error: error.message });
  }
};

export const AddToCart = async (req, res) => {
  const customer = req.user;
  const { _id, unit } = req.body;

  try {
    if (!customer) {
      console.log('No authenticated customer found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id);
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    console.log(`Fetching food item ${_id}`);
    const food = await Food.findById(_id);
    if (!food) {
      console.log(`Food item not found: ${_id}`);
      return res.status(400).json({ message: 'Food item not found' });
    }

    let cartItems = profile.cart || [];
    if (!Number.isInteger(unit) || unit < 0) {
      console.log(`Invalid unit value: ${unit}`);
      return res.status(400).json({ message: 'Unit must be a non-negative integer' });
    }

    console.log(`Updating cart for food item ${_id}`);
    const existingItem = cartItems.find((item) => item.food.toString() === _id);
    if (existingItem) {
      if (unit > 0) {
        existingItem.unit += unit;
      } else {
        cartItems = cartItems.filter((item) => item.food.toString() !== _id);
      }
    } else if (unit > 0) {
      cartItems.push({ food: food._id, unit });
    }

    profile.cart = cartItems;
    await profile.save();
    console.log(`Cart updated for customer ID: ${customer._id}`);

    const userResponse = await Customer.findById(profile._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json({
      cart: userResponse.cart,
      totalUnits: cartItems.reduce((sum, item) => sum + item.unit, 0),
    });
  } catch (error) {
    console.error(`Error adding to cart: ${error.message}`);
    return res.status(400).json({ message: 'Error adding to cart', error: error.message });
  }
};

export const GetCart = async (req, res) => {
  const customer = req.user;

  try {
    if (!customer) {
      console.log('No authenticated customer found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching cart for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id)
      .populate('cart.food')
      .select('-password -__v -createdAt -updatedAt');
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    return res.status(200).json(profile.cart);
  } catch (error) {
    console.error(`Error fetching cart: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching cart', error: error.message });
  }
};

export const DeleteCart = async (req, res) => {
  const customer = req.user;

  try {
    if (!customer) {
      console.log('No authenticated customer found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching profile for customer ID: ${customer._id}`);
    const profile = await Customer.findById(customer._id);
    if (!profile) {
      console.log(`Customer not found for ID: ${customer._id}`);
      return res.status(400).json({ message: 'Customer not found' });
    }

    profile.cart = [];
    await profile.save();
    console.log(`Cart cleared for customer ID: ${customer._id}`);

    const userResponse = await Customer.findById(profile._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(userResponse.cart);
  } catch (error) {
    console.error(`Error clearing cart: ${error.message}`);
    return res.status(400).json({ message: 'Error clearing cart', error: error.message });
  }
};

export const VerifyOffer = async (req, res) => {
  const user = req.user;
  const offerId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      console.log(`Invalid offer ID: ${offerId}`);
      return res.status(400).json({ message: 'Invalid offer ID' });
    }

    if (!user) {
      console.log('No authenticated user found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log(`Fetching offer ${offerId}`);
    const offer = await Offer.findById(offerId);
    if (!offer || !offer.isActive) {
      console.log(`Offer not found or inactive: ${offerId}`);
      return res.status(404).json({ message: 'Offer not found or inactive' });
    }

    console.log(`Fetching customer for user ID: ${user._id}`);
    const customer = await Customer.findById(user._id);
    if (!customer) {
      console.log(`Customer not found for ID: ${user._id}`);
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (offer.pincode && customer.pincode !== offer.pincode) {
      console.log(`Offer not applicable for customer's pincode: ${customer.pincode}`);
      return res.status(400).json({ message: 'Offer not applicable for your location' });
    }

    console.log(`Offer verified successfully: ${offerId}`);
    return res.status(200).json({ message: 'Offer verified', offer });
  } catch (error) {
    console.error(`Error verifying offer ${offerId}: ${error.message}`);
    return res.status(500).json({ message: 'Error verifying offer', error: error.message });
  }
};

export const CreatePayment = async (req, res) => {
  const customer = req.user;
  const { amount, paymentMode, offerId } = req.body;

  try {
    if (!customer) {
      console.log('No authenticated customer found');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    let payableAmount = Number(amount);
    if (offerId) {
      console.log(`Fetching offer ${offerId} for payment`);
      const appliedOffer = await Offer.findById(offerId);
      if (appliedOffer && appliedOffer.isActive) {
        payableAmount -= appliedOffer.offerAmount;
        console.log(`Applied offer ${offerId}, reduced amount to ${payableAmount}`);
      }
    }

    console.log(`Creating transaction for customer ID: ${customer._id}`);
    const transaction = await Transaction.create({
      customer: customer._id,
      vendorId: '',
      orderId: '',
      orderValue: payableAmount,
      offerUsed: offerId || 'NA',
      status: 'OPEN',
      paymentMode,
      paymentResponse: 'Payment is cash on delivery',
    });

    console.log(`Transaction created: ${transaction._id}`);
    return res.status(200).json(transaction);
  } catch (error) {
    console.error(`Error creating payment: ${error.message}`);
    return res.status(400).json({ message: 'Error creating payment', error: error.message });
  }
};