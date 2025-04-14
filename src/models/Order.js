import mongoose, { Schema } from 'mongoose';

const OrderSchema = new Schema({
  orderId: {
    type: String,
    required: true,
  },
  vendorId: {
    type: String,
    required: true,
  },
  items: [{
    food: { type: Schema.Types.ObjectId, ref: 'food', required: true },
    unit: { type: Number, required: true },
  }],
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    required: true,
  },
  orderDate: {
    type: Date,
  },
  orderStatus: {
    type: String,
  },
  remarks: {
    type: String,
  },
  deliveryId: {
    type: String,
  },
  readyTime: {
    type: Number,
  },
}, {
  timestamps: true,
});

export default mongoose.model('order', OrderSchema);