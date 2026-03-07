import express from 'express';
import { createOrder, verifyPayment } from '../controllers/paymentController';
import authMiddleware from '../middleware/auth';
import router from './downloads';

const routerP = express.Router();

router.post('/create-order', authMiddleware, createOrder);
router.post('/verify',       authMiddleware, verifyPayment);

export { routerP as paymentsRouter };