// src/routes/VendorRoute.js
import { Router } from 'express';
import {
  VendorLogin,
  GetVendorProfile,
  UpdateVendorProfile,
  UpdateVendorCoverImage,
  UpdateVendorService,
  AddFood,
  GetFoods,
  GetCurrentOrders,
  GetOrderDetails,
  ProcessOrder,
  GetOffers,
  AddOffer,
  EditOffer,
} from '../controllers/VendorController.js';
import { validateSignature } from '../utility/PasswordUnility.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Ensure Uploads directory exists
const uploadDir = path.join(process.cwd(), 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
  },
});

const router = Router();

router.post('/login', VendorLogin);
router.get('/profile', validateSignature, GetVendorProfile);
router.patch('/profile', validateSignature, UpdateVendorProfile);
router.patch('/coverimage', validateSignature, upload.array('images'), UpdateVendorCoverImage);
router.patch('/service', validateSignature, UpdateVendorService);
router.post('/food', validateSignature, upload.array('images'), AddFood);
router.get('/foods', validateSignature, GetFoods);
router.get('/orders', validateSignature, GetCurrentOrders);
router.get('/order/:id', validateSignature, GetOrderDetails);
router.put('/order/:id', validateSignature, ProcessOrder);
router.get('/offers', validateSignature, GetOffers);
router.post('/offer', validateSignature, AddOffer);
router.put('/offer/:id', validateSignature, EditOffer);

export default router;