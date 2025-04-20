import Vendor from '../models/Vendor.js';
import DeliveryUser from '../models/DeliveryUser.js';
import Transaction from '../models/Transaction.js';
import { generatePassword } from '../utility/PasswordUnility.js'

export const FindVendor = async (id, email) => {
  try {
    if (email) {
      console.log(`Finding vendor by email: ${email}`);
      return await Vendor.findOne({ email }).select('-password -__v -createdAt -updatedAt');
    }
    console.log(`Finding vendor by ID: ${id}`);
    return await Vendor.findById(id).select('-password -__v -createdAt -updatedAt');
  } catch (error) {
    console.error(`Error finding vendor: ${error.message}`);
    return null;
  }
};

export const CreateVendor = async (req, res) => {
  const { name, address, pincode, foodType, email, password, ownerName, phone } = req.body;

  try {
    console.log(`Attempting to create vendor for email: ${email}`);
    const existingVendor = await FindVendor('', email);
    if (existingVendor) {
      console.log(`Vendor already exists for email: ${email}`);
      return res.status(400).json({ message: 'A vendor exists with this email ID' });
    }

    const userPassword = await generatePassword(password);
    console.log(`Creating vendor for ${email}`);
    const createdVendor = await Vendor.create({
      name,
      address,
      pincode,
      foodType,
      email,
      password: userPassword,
      ownerName,
      phone,
      rating: 0,
      serviceAvailable: false,
      coverImages: [],
      lat: 0,
      lng: 0,
    });

    console.log(`Vendor created successfully: ${createdVendor._id}`);
    const vendorResponse = await Vendor.findById(createdVendor._id).select('-password -__v -createdAt -updatedAt');
    return res.status(201).json(vendorResponse);
  } catch (error) {
    console.error(`Error creating vendor: ${error.message}`);
    return res.status(400).json({ message: 'Error creating vendor', error: error.message });
  }
};

export const GetVendors = async (req, res) => {
  try {
    console.log('Fetching all vendors');
    const vendors = await Vendor.find().select('-password -__v -createdAt -updatedAt');
    if (vendors.length) {
      return res.status(200).json(vendors);
    }
    console.log('No vendors found');
    return res.status(404).json({ message: 'Vendors data not available' });
  } catch (error) {
    console.error(`Error fetching vendors: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching vendors', error: error.message });
  }
};

export const GetVendorByID = async (req, res) => {
  const vendorId = req.params.id;

  try {
    console.log(`Fetching vendor by ID: ${vendorId}`);
    const vendor = await FindVendor(vendorId);
    if (vendor) {
      return res.status(200).json(vendor);
    }
    console.log(`Vendor not found for ID: ${vendorId}`);
    return res.status(404).json({ message: 'Vendor data not available' });
  } catch (error) {
    console.error(`Error fetching vendor ${vendorId}: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching vendor', error: error.message });
  }
};

export const GetTransactions = async (req, res) => {
  try {
    console.log('Fetching all transactions');
    const transactions = await Transaction.find();
    if (transactions.length) {
      return res.status(200).json(transactions);
    }
    console.log('No transactions found');
    return res.status(404).json({ message: 'Transactions data not available' });
  } catch (error) {
    console.error(`Error fetching transactions: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching transactions', error: error.message });
  }
};

export const GetTransactionById = async (req, res) => {
  try {
    console.log(`Fetching transaction ${req.params.id}`);
    const transaction = await Transaction.findById(req.params.id);
    if (transaction) {
      return res.status(200).json(transaction);
    }
    console.log(`Transaction not found: ${req.params.id}`);
    return res.status(404).json({ message: 'Transaction data not available' });
  } catch (error) {
    console.error(`Error fetching transaction ${req.params.id}: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching transaction', error: error.message });
  }
};

export const VerifyDeliveryUser = async (req, res) => {
  const { _id, status } = req.body;

  try {
    if (!_id) {
      console.log('No delivery user ID provided');
      return res.status(400).json({ message: 'Delivery user ID is required' });
    }

    console.log(`Fetching delivery user ${_id}`);
    const profile = await DeliveryUser.findById(_id);
    if (profile) {
      profile.verified = status;
      await profile.save();
      console.log(`Delivery user ${_id} verification status updated to ${status}`);

      const userResponse = await DeliveryUser.findById(_id).select('-password -__v -createdAt -updatedAt');
      return res.status(200).json(userResponse);
    }

    console.log(`Delivery user not found: ${_id}`);
    return res.status(400).json({ message: 'Unable to verify Delivery User' });
  } catch (error) {
    console.error(`Error verifying delivery user ${_id}: ${error.message}`);
    return res.status(400).json({ message: 'Error verifying delivery user', error: error.message });
  }
};

export const GetDeliveryUsers = async (req, res) => {
  try {
    console.log('Fetching all delivery users');
    const deliveryUsers = await DeliveryUser.find().select('-password -__v -createdAt -updatedAt');
    if (deliveryUsers.length) {
      return res.status(200).json(deliveryUsers);
    }
    console.log('No delivery users found');
    return res.status(404).json({ message: 'Unable to get Delivery Users' });
  } catch (error) {
    console.error(`Error fetching delivery users: ${error.message}`);
    return res.status(400).json({ message: 'Error fetching delivery users', error: error.message });
  }
};