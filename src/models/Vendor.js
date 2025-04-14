import mongoose, { Schema } from 'mongoose';

const VendorSchema = new Schema({
    name: { type: String, required: true },
    ownerName: { type: String, required: true },
    foodType: [String],
    pincode: { type: String, required: true },
    address: { type: String },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    serviceAvailable: { type: Boolean },
    coverImages: [String],
    rating: { type: Number },
    foods: [{ type: Schema.Types.ObjectId, ref: 'food' }],
    lat: { type: Number },
    lng: { type: Number },
}, { timestamps: true });

export default mongoose.model('vendor', VendorSchema);