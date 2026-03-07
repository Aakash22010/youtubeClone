import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';

// ── Plan limits in seconds (server-side source of truth) ─────────────────────
const PLAN_LIMITS_SECONDS: Record<string, number> = {
  free:   300,        // 5 min
  bronze: 420,        // 7 min
  silver: 600,        // 10 min
  gold:   Infinity,
};

function getEffectivePlan(user: any): string {
  const plan = user.plan || 'free';
  if (plan === 'free') return 'free';
  // Auto-downgrade if plan expired
  if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) return 'free';
  return plan;
}

// @desc  Increment cumulative watch time and check if limit is reached
// @route POST /api/watch-time/increment
// Body: { seconds: number }   — send every ~5s while video is playing
export const incrementWatchTime = async (req: AuthRequest, res: Response) => {
  try {
    const seconds = Number(req.body.seconds);
    if (!seconds || seconds <= 0 || seconds > 30) {
      // Reject unreasonable values (> 30s per call means something is wrong)
      return res.status(400).json({ error: 'Invalid seconds value (must be 1–30)' });
    }

    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const effectivePlan = getEffectivePlan(user);
    const planLimit     = PLAN_LIMITS_SECONDS[effectivePlan];

    // If already over limit, don't increment further — just return current state
    const currentTotal = user.totalWatchSeconds || 0;
    if (planLimit !== Infinity && currentTotal >= planLimit) {
      return res.json({
        totalWatchSeconds: currentTotal,
        limitReached:      true,
        plan:              effectivePlan,
        planLimit:         planLimit === Infinity ? -1 : planLimit,
      });
    }

    // Increment — clamp to planLimit so DB value never wildly overshoots
    const newTotal = planLimit !== Infinity
      ? Math.min(currentTotal + seconds, planLimit)
      : currentTotal + seconds;

    await User.findByIdAndUpdate(req.user!._id, { totalWatchSeconds: newTotal });

    const limitReached = planLimit !== Infinity && newTotal >= planLimit;

    res.json({
      totalWatchSeconds: newTotal,
      limitReached,
      plan:              effectivePlan,
      planLimit:         planLimit === Infinity ? -1 : planLimit,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc  Get current cumulative watch time and plan info
// @route GET /api/watch-time/me
export const getWatchTime = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id)
      .select('plan planExpiresAt totalWatchSeconds');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const effectivePlan    = getEffectivePlan(user);
    const planLimit        = PLAN_LIMITS_SECONDS[effectivePlan];
    const totalWatchSeconds = user.totalWatchSeconds || 0;

    // Auto-downgrade expired plan in DB
    if (user.plan !== 'free' && effectivePlan === 'free') {
      await User.findByIdAndUpdate(req.user!._id, { plan: 'free', planExpiresAt: null });
    }

    res.json({
      totalWatchSeconds,
      limitReached: planLimit !== Infinity && totalWatchSeconds >= planLimit,
      plan:         effectivePlan,
      planLimit:    planLimit === Infinity ? -1 : planLimit,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc  Reset cumulative watch time (called after successful plan upgrade)
// @route POST /api/watch-time/reset
export const resetWatchTime = async (req: AuthRequest, res: Response) => {
  try {
    await User.findByIdAndUpdate(req.user!._id, { totalWatchSeconds: 0 });
    res.json({ success: true, totalWatchSeconds: 0 });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};