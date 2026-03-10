import express from 'express';
import { sendEmailOTP, verifyEmailOTP } from '../controllers/otpController';

const router = express.Router();

router.post('/send-email', sendEmailOTP);
router.post('/verify',     verifyEmailOTP);

export default router;