import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

const PREMIUM_AMOUNT_PAISE = 19900; // ₹199
const CURRENCY             = 'INR';

// Lazy initialiser — called inside each handler so env vars are
// guaranteed to be loaded by the time the function runs.
function getRazorpay() {
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      'Razorpay keys missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment.'
    );
  }

  return new Razorpay({ key_id, key_secret });
}

// @desc   Create a Razorpay order
// @route  POST /api/payments/create-order
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const razorpay = getRazorpay(); // ← initialised here, not at module load

    const order = await razorpay.orders.create({
      amount:   PREMIUM_AMOUNT_PAISE,
      currency: CURRENCY,
      receipt:  `receipt_${req.user!._id}_${Date.now()}`,
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('createOrder error:', (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc   Verify Razorpay payment signature and upgrade user
// @route  POST /api/payments/verify
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return res.status(500).json({ error: 'Razorpay secret key not configured' });
    }

    // Validate HMAC signature
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', key_secret)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Upgrade user to premium
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        isPremium:         true,
        premiumSince:      new Date(),
        razorpayPaymentId: razorpay_payment_id,
      },
      { new: true }
    );

    res.json({ success: true, isPremium: user?.isPremium });
  } catch (error) {
    console.error('verifyPayment error:', (error as Error).message);
    res.status(500).json({ error: (error as Error).message });
  }
};