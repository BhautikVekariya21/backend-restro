import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import Food from '../models/Food.js';
import Offer from '../models/Offer.js';

export const GetFoodAvailability = async (req, res) => {
    try {
        const vendors = await Vendor.find({ pincode: req.params.pincode, serviceAvailable: true })
            .populate('foods')
            .select('-password -__v -createdAt -updatedAt');
        return res.status(200).json(vendors);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching availability', error: error.message });
    }
};

export const GetTopRestaurants = async (req, res) => {
    try {
        const vendors = await Vendor.find({
            pincode: req.params.pincode,
            serviceAvailable: true,
            rating: { $gte: 4.0 },
        })
            .sort({ rating: -1 })
            .limit(10)
            .select('-password -__v -createdAt -updatedAt');
        return res.status(200).json(vendors);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching top restaurants', error: error.message });
    }
};

export const GetFoodsIn30Min = async (req, res) => {
    try {
        const foods = await Food.find({ readyTime: { $lte: 30 } }).populate({
            path: 'vendorId',
            match: { pincode: req.params.pincode, serviceAvailable: true },
            select: '-password -__v -createdAt -updatedAt',
        });
        const availableFoods = foods.filter((food) => food.vendorId);
        return res.status(200).json(availableFoods);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching fast foods', error: error.message });
    }
};

export const SearchFoods = async (req, res) => {
    try {
        const query = req.query.query || '';
        const foods = await Food.find({ name: { $regex: query, $options: 'i' } }).populate({
            path: 'vendorId',
            match: { pincode: req.params.pincode, serviceAvailable: true },
            select: '-password -__v -createdAt -updatedAt',
        });
        const availableFoods = foods.filter((food) => food.vendorId);
        return res.status(200).json(availableFoods);
    } catch (error) {
        return res.status(500).json({ message: 'Error searching foods', error: error.message });
    }
};

export const GetAvailableOffers = async (req, res) => {
    try {
        const offers = await Offer.find({ pincode: req.params.pincode, isActive: true });
        return res.status(200).json(offers);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching offers', error: error.message });
    }
};

export const RestaurantById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid restaurant ID' });
        }
        const vendor = await Vendor.findById(req.params.id)
            .populate('foods')
            .select('-password -__v -createdAt -updatedAt');
        if (!vendor) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        return res.status(200).json(vendor);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching restaurant', error: error.message });
    }
};