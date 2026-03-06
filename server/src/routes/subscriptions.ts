import express from 'express';
import authMiddleware from '../middleware/auth';
import optionalAuth from '../middleware/optionalAuth';
import { toggleSubscription, getSubscriptionStatus } from '../controllers/subscriptionController';

const router = express.Router();

// POST /api/subscriptions/:channelId – toggle subscription (requires auth)
router.post('/:channelId', authMiddleware, toggleSubscription);

// GET /api/subscriptions/status/:channelId – get subscription status (optional auth)
router.get('/status/:channelId', optionalAuth, getSubscriptionStatus);

export default router;