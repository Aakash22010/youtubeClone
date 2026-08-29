import { Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';
import { one, q } from '../utils/db';
import { sendPlanInvoiceEmail } from '../services/emailService';

// ── Plan config ────────────────────────────────────────────────────────────────

export type Plan = 'bronze' | 'silver' | 'gold';

const PLAN_PRICES: Record<Plan, number> = {
  bronze: 1000,   // ₹10  in paise
  silver: 5000,   // ₹50  in paise
  gold: 10000,  // ₹100 in paise
};

const PLAN_PRICES_INR: Record<Plan, number> = {
  bronze: 10,
  silver: 50,
  gold: 100,
};

const VALID_PLANS: Plan[] = ['bronze', 'silver', 'gold'];

// ── Helper ─────────────────────────────────────────────────────────────────────

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
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
    if (e.description) return e.description;
    if (e.message) return e.message;
    return JSON.stringify(e);
  }
  return String(error);
}

// ── Create order ───────────────────────────────────────────────────────────────
// POST /api/plans/create-order
// Body: { plan: 'bronze' | 'silver' | 'gold' }

export const createPlanOrder = async (req: AuthRequest, res: Response) => {
  try {
    const plan = req.body.plan as Plan;

    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` });
    }

    const razorpay = getRazorpay();

    // Receipt max 40 chars: "pl_" (3) + plan (6 max) + "_" + last 6 of userId + _ + 8 digit ts = 27 max
    const receipt = `pl_${plan}_${String(req.user!._id).slice(-6)}_${Date.now().toString().slice(-8)}`;

    const order = await razorpay.orders.create({
      amount: PLAN_PRICES[plan],
      currency: 'INR',
      receipt,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan,
    });
  } catch (error) {
    console.error('createPlanOrder error:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: parseError(error) });
  }
};

// ── Verify & activate ──────────────────────────────────────────────────────────
// POST /api/plans/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan }

export const verifyPlanPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    if (!VALID_PLANS.includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return res.status(500).json({ error: 'Razorpay secret not configured' });
    }

    // Validate HMAC signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', key_secret)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Plan valid for 1 month from now
    const planFrom = new Date();
    const planExpiresAt = new Date(planFrom);
    planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);

    const user = await one<{
      email: string;
      display_name: string;
      plan: string;
      plan_expires_at: Date;
    }>(
      `update users set plan = $2, plan_expires_at = $3, plan_payment_id = $4
        where id = $1
        returning email, display_name, plan, plan_expires_at`,
      [req.user!._id, plan, planExpiresAt, razorpay_payment_id],
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send invoice email (non-blocking — don't fail if email fails)
    console.log('Sending invoice email to:', user.email);
    sendPlanInvoiceEmail({
      toEmail: user.email,
      displayName: user.display_name,
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      amount: PLAN_PRICES_INR[plan as Plan],
      paymentId: razorpay_payment_id,
      planFrom,
      planTo: planExpiresAt,
    }).then(() => console.log('Invoice email sent successfully'))
      .catch(err => console.error('Invoice email failed:', err.message));

    res.json({
      success: true,
      plan: user.plan,
      planExpiresAt: user.plan_expires_at,
    });
  } catch (error) {
    console.error('verifyPlanPayment error:', JSON.stringify(error, null, 2));
    res.status(500).json({ error: parseError(error) });
  }
};

// ── Get current plan ───────────────────────────────────────────────────────────
// GET /api/plans/me

export const getMyPlan = async (req: AuthRequest, res: Response) => {
  try {
    const user = await one<{ plan: string; plan_expires_at: Date | null }>(
      'select plan, plan_expires_at from users where id = $1',
      [req.user!._id],
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Auto-downgrade if plan has expired
    const now = new Date();
    let effectivePlan = user.plan || 'free';
    if (effectivePlan !== 'free' && user.plan_expires_at && new Date(user.plan_expires_at) < now) {
      effectivePlan = 'free';
      await q("update users set plan = 'free', plan_expires_at = null where id = $1", [req.user!._id]);
    }

    res.json({
      plan: effectivePlan,
      planExpiresAt: effectivePlan === 'free' ? null : user.plan_expires_at,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};