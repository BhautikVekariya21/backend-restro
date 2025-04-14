// src/models/Customer.js
import mongoose, { Schema } from 'mongoose';

const CustomerSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],

    },
    firstName: {
      type: String,
      trim: true,
      minlength: [3, 'First name must be at least 3 characters'],
      maxlength: [16, 'First name must not exceed 16 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      minlength: [3, 'Last name must be at least 3 characters'],
      maxlength: [16, 'Last name must not exceed 16 characters'],
    },
    address: {
      type: String,
      trim: true,
      minlength: [6, 'Address must be at least 6 characters'],
      maxlength: [24, 'Address must not exceed 24 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
      minlength: [4, 'Pincode must be at least 4 characters'],
      maxlength: [12, 'Pincode must not exceed 12 characters'],
    },
    verified: { type: Boolean, default: false },
    lat: { type: Number },
    lng: { type: Number },
    cart: [
      {
        food: { type: Schema.Types.ObjectId, ref: 'food', required: true },
        unit: { type: Number, required: true, min: [1, 'Unit must be at least 1'] },
      },
    ],
    orders: [{ type: Schema.Types.ObjectId, ref: 'order' }],
  },
  { timestamps: true }
);

export default mongoose.model('customer', CustomerSchema);