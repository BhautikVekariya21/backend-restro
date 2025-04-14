// src/models/DeliveryUser.js
import mongoose, { Schema } from 'mongoose';

const DeliveryUserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  phone: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  isAvailable: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export default mongoose.model('DeliveryUser', DeliveryUserSchema);