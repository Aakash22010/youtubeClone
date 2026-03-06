import express from 'express';
import authMiddleware from '../middleware/auth';
import { login } from '../controllers/authController';

const router = express.Router();

router.post('/login', authMiddleware, login);

export default router;