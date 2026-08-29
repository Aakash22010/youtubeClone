import express from 'express';
import authMiddleware from '../middleware/auth';
import { googleAuth, login, me, signup } from '../controllers/authController';

const router = express.Router();

router.post('/google', googleAuth);
router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, me);

export default router;
