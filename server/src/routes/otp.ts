import express from 'express';
import { sendEmailOTP, sendPhoneOTP, verifyOTP } from '../controllers/otpController';

const router = express.Router();

router.post('/send-email', sendEmailOTP);   // South India users
router.post('/send-phone', sendPhoneOTP);   // Other region users (Fast2SMS)
router.post('/verify',     verifyOTP);      // Both — key = email or phone

export default router;