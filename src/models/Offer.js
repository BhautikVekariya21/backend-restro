import mongoose, { Schema } from 'mongoose';

const OfferSchema = new Schema({
  offerType: {
    type: String,
    required: true,
  },
  vendors: [{
    type: Schema.Types.ObjectId,
    ref: 'vendor',
  }],
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  minValue: {
    type: Number,
    required: true,
  },
  offerAmount: {
    type: Number,
    required: true,
  },
  startValidity: Date,
  endValidity: Date,
  promocode: {
    type: String,
    required: true,
  },
  promoType: {
    type: String,
    required: true,
  },
  bank: [String],
  bins: [Number],
  pincode: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
  },
}, {
  timestamps: true,
});

export default mongoose.model('offer', OfferSchema);