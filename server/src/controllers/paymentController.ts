import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import { sendPlanInvoiceEmail } from '../services/emailService';

const PREMIUM_AMOUNT_PAISE = 19900; // ₹199
const CURRENCY             = 'INR';

function getRazorpay() {
  const key_id     = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys missing — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return new Razorpay({ key_id, key_secret });
}

function parseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const e = error as any;
    if (e.error?.description) return e.error.description;
    if (e.description)        return e.description;
    if (e.message)            return e.message;
    return JSON.stringify(e);
  }
  return String(error);
}

// @desc   Create a Razorpay order for download premium
// @route  POST /api/payments/create-order
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const razorpay = getRazorpay();
    const receipt  = `rcp_${String(req.user!._id).slice(-6)}_${Date.now().toString().slice(-8)}`;

    const order = await razorpay.orders.create({
      amount:   PREMIUM_AMOUNT_PAISE,
      currency: CURRENCY,
      receipt,
    });

    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('createOrder error (full):', JSON.stringify(error, null, 2));
    res.status(500).json({ error: parseError(error) });
  }
};

// @desc   Verify payment, upgrade user to premium, send invoice email
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

    const now           = new Date();
    const premiumExpiry = new Date(now);
    premiumExpiry.setMonth(premiumExpiry.getMonth() + 1);

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      {
        isPremium:         true,
        premiumSince:      now,
        razorpayPaymentId: razorpay_payment_id,
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Send invoice email (non-blocking)
    sendPlanInvoiceEmail({
      toEmail:     user.email,
      displayName: user.displayName,
      plan:        'Premium',
      amount:      199,
      paymentId:   razorpay_payment_id,
      planFrom:    now,
      planTo:      premiumExpiry,
    }).catch(err => console.error('Premium invoice email failed:', err.message));

    res.json({ success: true, isPremium: user.isPremium });
  } catch (error) {
    console.error('verifyPayment error (full):', JSON.stringify(error, null, 2));
    res.status(500).json({ error: parseError(error) });
  }
};