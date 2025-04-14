import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    customer: { type: String },
    vendorId: { type: String },
    orderId: { type: String },
    orderValue: { type: Number, required: true },
    offerUsed: { type: String },
    status: { type: String, required: true },
    paymentMode: { type: String },
    paymentResponse: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('transaction', TransactionSchema);