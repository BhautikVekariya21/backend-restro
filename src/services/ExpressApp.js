// src/services/ExpressApp.js
import express from 'express';
import cookieParser from 'cookie-parser';
import CustomerRoute from '../routes/CustomerRoute.js';
import VendorRoute from '../routes/VendorRoute.js';
import DeliveryRoute from '../routes/DeliveryRoute.js';
import AdminRoute from '../routes/AdminRoute.js';
import ShoppingRoute from '../routes/ShoppingRoutes.js';
import multer from 'multer';

const configureApp = async (app) => {
  console.log('Setting up Express middleware...');
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './Uploads'),
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
  });

  const upload = multer({ storage });
  app.use('/images', express.static('Uploads'));

  console.log('Registering routes...');
  app.use('/customer', CustomerRoute);
  app.use('/vendor', VendorRoute);
  app.use('/delivery', DeliveryRoute);
  app.use('/admin', AdminRoute);
  app.use('/shopping', ShoppingRoute);

  app.get('/', (req, res) => {
    console.log('Health check accessed');
    res.status(200).json({ message: 'Server is running' });
  });
};

export default configureApp;