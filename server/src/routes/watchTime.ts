import express from 'express';
import { incrementWatchTime, getWatchTime, resetWatchTime } from '../controllers/watchTimeController';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/me',         authMiddleware, getWatchTime);
router.post('/increment', authMiddleware, incrementWatchTime);
router.post('/reset',     authMiddleware, resetWatchTime);

export default router;