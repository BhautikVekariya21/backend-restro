import mongoose, { Schema } from 'mongoose';

const FoodSchema = new Schema({
  vendorId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
  },
  foodType: {
    type: String,
    required: true,
  },
  readyTime: {
    type: Number,
  },
  price: {
    type: Number,
  },
  rating: {
    type: Number,
  },
  images: [String],
}, {
  timestamps: true,
});

export default mongoose.model('food', FoodSchema);