// src/routes/DeliveryRoute.js
import { Router } from 'express';
import {
  DeliverySignUp,
  DeliveryLogin,
  DeliveryVerify,
  DeliveryRequestOtp,
  GetDeliveryProfile,
  EditDeliveryProfile,
  UpdateDeliveryUserStatus,
} from '../controllers/DeliveryController.js';
import { validateSignature } from '../utility/PasswordUnility.js';

const router = Router();

router.post('/signup', DeliverySignUp);
router.post('/login', DeliveryLogin);
router.patch('/verify', validateSignature, DeliveryVerify);
router.get('/otp', validateSignature, DeliveryRequestOtp);
router.get('/profile', validateSignature, GetDeliveryProfile);
router.patch('/profile', validateSignature, EditDeliveryProfile);
router.patch('/status', validateSignature, UpdateDeliveryUserStatus);

export default router;