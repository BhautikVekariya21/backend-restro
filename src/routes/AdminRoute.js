import { Router } from 'express';
import {
    CreateVendor,
    GetVendors,
    GetVendorByID,
    GetTransactions,
    GetTransactionById,
    VerifyDeliveryUser,
    GetDeliveryUsers,
} from '../controllers/index.js';

const router = Router();

router.post('/vendor', CreateVendor);
router.get('/vendors', GetVendors);
router.get('/vendor/:id', GetVendorByID);
router.get('/transactions', GetTransactions);
router.get('/transaction/:id', GetTransactionById);
router.put('/delivery/verify', VerifyDeliveryUser);
router.get('/delivery/users', GetDeliveryUsers);
router.get('/', (req, res) => res.json({ message: 'Hello from Admin' }));

export default router;