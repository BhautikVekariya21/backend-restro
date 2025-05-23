import Food from '../models/Food.js';
import Offer from '../models/Offer.js';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';
import { FindVendor } from './AdminController.js';
import { validatePassword, generateSignature } from '../utility/PasswordUnility.js';
import { uploadToCloudinary, deleteLocalFile } from '../utility/CloudinaryUtility.js';
import fs from 'fs';

export const VendorLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await Vendor.findOne({ email }).select('+password');
    if (existingUser) {
      const validation = await validatePassword(password, existingUser.password);
      if (validation) {
        const token = await generateSignature({
          _id: existingUser._id,
          email: existingUser.email,
          name: existingUser.name,
        });

        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 90 * 24 * 60 * 60 * 1000,
        });

        const vendorResponse = await Vendor.findById(existingUser._id).select('-password -__v -createdAt -updatedAt');
        return res.status(200).json(vendorResponse.toObject());
      }
    }
    return res.status(400).json({ message: 'Login credential is not valid' });
  } catch (error) {
    console.error(`Error during vendor login: ${error.message}`);
    return res.status(400).json({ message: 'Error during login', error: error.message });
  }
};

export const UpdateVendorCoverImage = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const vendor = await Vendor.findById(user._id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const imageUrls = [];
    const failedFiles = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.path} (original: ${file.originalname})`);
        if (!fs.existsSync(file.path)) {
          throw new Error(`File not found on server: ${file.path}`);
        }
        const url = await uploadToCloudinary(file.path, file.originalname);
        if (!url.startsWith('https://res.cloudinary.com/')) {
          throw new Error(`Invalid Cloudinary URL: ${url}`);
        }
        imageUrls.push(url);
        deleteLocalFile(file.path);
      } catch (error) {
        console.error(`Failed to upload ${file.originalname}: ${error.message}`);
        failedFiles.push(file.originalname);
      }
    }

    if (imageUrls.length > 0) {
      vendor.coverImages.push(...imageUrls);
      await vendor.save();
    }

    if (failedFiles.length > 0) {
      fs.appendFileSync('failed_uploads.log', `${new Date().toISOString()}: ${failedFiles.join(', ')} (Vendor: ${vendor._id})\n`);
    }

    const vendorResponse = await Vendor.findById(vendor._id).select('-password -__v -createdAt -updatedAt');
    if (failedFiles.length > 0) {
      return res.status(207).json({
        message: `Partial success: ${imageUrls.length} images uploaded, ${failedFiles.length} failed. Local files retained for failed uploads.`,
        failedFiles,
        vendor: vendorResponse,
      });
    }
    return res.status(200).json(vendorResponse);
  } catch (error) {
    console.error(`Error updating cover image: ${error.message}`);
    return res.status(400).json({ message: 'Error updating cover image, local files retained', error: error.message });
  }
};

export const AddFood = async (req, res) => {
  try {
    const user = req.user;
    const { name, description, category, foodType, readyTime, price } = req.body;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const vendor = await Vendor.findById(user._id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }
    const files = req.files;
    let imageUrls = [];
    const failedFiles = [];

    if (files && files.length > 0) {
      for (const file of files) {
        try {
          console.log(`Processing file: ${file.path} (original: ${file.originalname})`);
          if (!fs.existsSync(file.path)) {
            throw new Error(`File not found on server: ${file.path}`);
          }
          const url = await uploadToCloudinary(file.path, file.originalname);
          if (!url.startsWith('https://res.cloudinary.com/')) {
            throw new Error(`Invalid Cloudinary URL: ${url}`);
          }
          imageUrls.push(url);
          deleteLocalFile(file.path);
        } catch (error) {
          console.error(`Failed to upload ${file.originalname}: ${error.message}`);
          failedFiles.push(file.originalname);
        }
      }
    }

    const food = await Food.create({
      vendorId: vendor._id,
      name,
      description,
      category,
      price: parseFloat(price),
      rating: 0,
      readyTime: parseInt(readyTime) || 0,
      foodType,
      images: imageUrls,
    });
    vendor.foods.push(food._id);
    await vendor.save();

    if (failedFiles.length > 0) {
      fs.appendFileSync('failed_uploads.log', `${new Date().toISOString()}: ${failedFiles.join(', ')} (Vendor: ${vendor._id}, Food: ${food._id})\n`);
    }

    const vendorResponse = await Vendor.findById(vendor._id).select('-password -__v -createdAt -updatedAt');
    if (failedFiles.length > 0) {
      return res.status(207).json({
        message: `Food added, but ${failedFiles.length} images failed to upload. Local files retained for failed uploads.`,
        failedFiles,
        vendor: vendorResponse,
      });
    }
    return res.status(200).json(vendorResponse);
  } catch (error) {
    console.error(`Error adding food: ${error.message}`);
    return res.status(400).json({ message: 'Error adding food, local files retained', error: error.message });
  }
};

export const GetVendorProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const existingVendor = await FindVendor(user._id);
    if (existingVendor) {
      return res.status(200).json(existingVendor);
    }
    return res.status(404).json({ message: 'Vendor Information Not Found' });
  } catch (error) {
    return res.status(400).json({ message: 'Error fetching profile', error: error.message });
  }
};

export const UpdateVendorProfile = async (req, res) => {
  try {
    const user = req.user;
    const { foodType, name, address, phone } = req.body;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const existingVendor = await Vendor.findById(user._id);
    if (!existingVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    existingVendor.name = name || existingVendor.name;
    existingVendor.address = address || existingVendor.address;
    existingVendor.phone = phone || existingVendor.phone;
    existingVendor.foodType = foodType || existingVendor.foodType;
    await existingVendor.save();
    const vendorResponse = await Vendor.findById(existingVendor._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(vendorResponse);
  } catch (error) {
    return res.status(400).json({ message: 'Error updating profile', error: error.message });
  }
};

export const UpdateVendorService = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const existingVendor = await Vendor.findById(user._id);
    if (!existingVendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    existingVendor.serviceAvailable = !existingVendor.serviceAvailable;
    if (req.body.lat !== undefined) existingVendor.lat = req.body.lat;
    if (req.body.lng !== undefined) existingVendor.lng = req.body.lng;
    await existingVendor.save(); // Fixed: Use existingVendor, not vendor
    const vendorResponse = await Vendor.findById(existingVendor._id).select('-password -__v -createdAt -updatedAt');
    return res.status(200).json(vendorResponse);
  } catch (error) {
    console.error(`Error updating service: ${error.message}`);
    return res.status(400).json({ message: 'Error updating service', error: error.message });
  }
};

export const GetFoods = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const foods = await Food.find({ vendorId: user._id });
    if (foods.length) {
      return res.status(200).json(foods);
    }
    return res.status(404).json({ message: 'Foods not found!' });
  } catch (error) {
    return res.status(400).json({ message: 'Error fetching foods', error: error.message });
  }
};

export const GetCurrentOrders = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const orders = await Order.find({ vendorId: user._id }).populate('items.food');
    if (orders.length) {
      return res.status(200).json(orders);
    }
    return res.status(404).json({ message: 'Orders Not found' });
  } catch (error) {
    return res.status(400).json({ message: 'Error fetching orders', error: error.message });
  }
};

export const GetOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID required' });
    }
    const order = await Order.findById(orderId).populate('items.food');
    if (order) {
      return res.status(200).json(order);
    }
    return res.status(404).json({ message: 'Order Not found' });
  } catch (error) {
    return res.status(400).json({ message: 'Error fetching order', error: error.message });
  }
};

export const ProcessOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, remarks, time } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID required' });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.orderStatus = status || order.orderStatus;
    order.remarks = remarks || order.remarks;
    if (time) order.readyTime = time;
    const orderResult = await order.save();
    return res.status(200).json(orderResult);
  } catch (error) {
    return res.status(400).json({ message: 'Error processing order', error: error.message });
  }
};

export const GetOffers = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    let currentOffer = [];
    const offers = await Offer.find().populate('vendors');
    if (offers) {
      offers.forEach((item) => {
        if (item.vendors) {
          item.vendors.forEach((vendor) => {
            if (vendor._id.toString() === user._id) {
              currentOffer.push(item);
            }
          });
        }
        if (item.offerType === 'GENERIC') {
          currentOffer.push(item);
        }
      });
    }
    return res.status(200).json(currentOffer);
  } catch (error) {
    return res.status(400).json({ message: 'Error fetching offers', error: error.message });
  }
};

export const AddOffer = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { title, description, offerType, offerAmount, pincode, promocode, promoType, startValidity, endValidity, bank, bins, minValue, isActive } = req.body;
    if (!title || !offerAmount || !promocode) {
      return res.status(400).json({ message: 'Title, offerAmount, and promocode are required' });
    }
    const vendor = await Vendor.findById(user._id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    const offer = await Offer.create({
      title,
      description,
      offerType,
      offerAmount,
      pincode,
      promocode,
      promoType,
      startValidity,
      endValidity,
      bank,
      bins,
      minValue,
      isActive,
      vendors: [vendor._id],
    });
    return res.status(200).json(offer);
  } catch (error) {
    console.error(`Error adding offer: ${error.message}`);
    return res.status(400).json({ message: 'Error adding offer', error: error.message });
  }
};

export const EditOffer = async (req, res) => {
  try {
    const user = req.user;
    const offerId = req.params.id;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (!offerId) {
      return res.status(400).json({ message: 'Offer ID required' });
    }
    const currentOffer = await Offer.findById(offerId);
    if (!currentOffer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    const vendor = await Vendor.findById(user._id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    const { title, description, offerType, offerAmount, pincode, promocode, promoType, startValidity, endValidity, bank, bins, minValue, isActive } = req.body;
    currentOffer.title = title || currentOffer.title;
    currentOffer.description = description || currentOffer.description;
    currentOffer.offerType = offerType || currentOffer.offerType;
    currentOffer.offerAmount = offerAmount || currentOffer.offerAmount;
    currentOffer.pincode = pincode || currentOffer.pincode;
    currentOffer.promocode = promocode || currentOffer.promocode;
    currentOffer.promoType = promoType || currentOffer.promoType;
    currentOffer.startValidity = startValidity || currentOffer.startValidity;
    currentOffer.endValidity = endValidity || currentOffer.endValidity;
    currentOffer.bank = bank || currentOffer.bank;
    currentOffer.bins = bins || currentOffer.bins;
    currentOffer.minValue = minValue || currentOffer.minValue;
    currentOffer.isActive = isActive !== undefined ? isActive : currentOffer.isActive;
    const result = await currentOffer.save();
    return res.status(200).json(result);
  } catch (error) {
    console.error(`Error editing offer: ${error.message}`);
    return res.status(400).json({ message: 'Error editing offer', error: error.message });
  }
};