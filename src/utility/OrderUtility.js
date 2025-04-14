// src/utility/OrderUtility.js
import { Order, Vendor, DeliveryUser } from '../models/index.js';

export const generateOrderId = async () => {
  try {
    const randomId = Math.floor(10000 + Math.random() * 90000).toString();
    const existingOrder = await Order.findOne({ orderId: randomId });
    if (existingOrder) {
      return await generateOrderId();
    }
    console.log(`Generated order ID: ${randomId}`);
    return randomId;
  } catch (error) {
    console.error(`Error generating order ID: ${error.message}`);
    throw new Error('Failed to generate order ID');
  }
};

export const assignOrderForDelivery = async (orderId, vendorId) => {
  try {
    console.log(`Assigning delivery for order ${orderId}`);
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      console.log(`Vendor not found for ID: ${vendorId}`);
      return;
    }
    const areaCode = vendor.pincode;
    console.log(`Finding delivery user for pincode: ${areaCode}`);
    const deliveryPerson = await DeliveryUser.findOne({
      pincode: areaCode,
      verified: true,
      isAvailable: true,
    });
    if (deliveryPerson) {
      console.log(`Assigning delivery user ${deliveryPerson._id} to order ${orderId}`);
      const currentOrder = await Order.findById(orderId);
      if (currentOrder) {
        currentOrder.deliveryId = deliveryPerson._id;
        await currentOrder.save();
        console.log(`Delivery assigned successfully for order ${orderId}`);
      }
    } else {
      console.log(`No available delivery user found for pincode: ${areaCode}`);
    }
  } catch (error) {
    console.error(`Error assigning delivery: ${error.message}`);
    throw new Error('Failed to assign delivery');
  }
};