import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

// Initialise Razorpay with your key pair (store in .env)
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const PREMIUM_AMOUNT_PAISE = 19900; // ₹199 in paise (test amount)
const CURRENCY             = 'INR';

// @desc   Create a Razorpay order
// @route  POST /api/payments/create-order
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const options = {
      amount:   PREMIUM_AMOUNT_PAISE,
      currency: CURRENCY,
      receipt:  `receipt_${req.user!._id}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc   Verify Razorpay payment signature and upgrade user
// @route  POST /api/payments/verify
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Validate signature
    const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Upgrade user to premium
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        isPremium:        true,
        premiumSince:     new Date(),
        razorpayPaymentId: razorpay_payment_id,
      },
      { new: true }
    );

    res.json({ success: true, isPremium: user?.isPremium });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};