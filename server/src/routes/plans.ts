import express from 'express';
import { createPlanOrder, verifyPlanPayment, getMyPlan } from '../controllers/planController';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/me',           authMiddleware, getMyPlan);
router.post('/create-order', authMiddleware, createPlanOrder);
router.post('/verify',       authMiddleware, verifyPlanPayment);

export default router;