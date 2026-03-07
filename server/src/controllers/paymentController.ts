import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

const PREMIUM_AMOUNT_PAISE = 19900; // ₹199
const CURRENCY             = 'INR';

// Razorpay throws plain objects, not Error instances.
// This helper extracts a readable message from whatever it throws.
function parseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const e = error as any;
    // Razorpay error shape: { statusCode, error: { description } }
    if (e.error?.description) return e.error.description;
    if (e.description)        return e.description;
    if (e.message)            return e.message;
    return JSON.stringify(e);
  }
  return String(error);
}

function getRazorpay() {
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      'Razorpay keys missing — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your Render environment variables.'
    );
  }

  return new Razorpay({ key_id, key_secret });
}

// @desc   Create a Razorpay order
// @route  POST /api/payments/create-order
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount:   PREMIUM_AMOUNT_PAISE,
      currency: CURRENCY,
      receipt: `rcp_${String(req.user!._id).slice(-6)}_${Date.now().toString().slice(-8)}`,
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    // Log full object so we can see the real Razorpay error in Render logs
    console.error('createOrder error (full):', JSON.stringify(error, null, 2));
    res.status(500).json({ error: parseError(error) });
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

    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', key_secret)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

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
    console.error('verifyPayment error (full):', JSON.stringify(error, null, 2));
    res.status(500).json({ error: parseError(error) });
  }
};