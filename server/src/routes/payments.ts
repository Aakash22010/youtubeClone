import express from 'express';
import { createOrder, verifyPayment } from '../controllers/paymentController';
import authMiddleware from '../middleware/auth';

const routerP = express.Router();

routerP.post('/create-order', authMiddleware, createOrder);
routerP.post('/verify',       authMiddleware, verifyPayment);

export { routerP as paymentsRouter };