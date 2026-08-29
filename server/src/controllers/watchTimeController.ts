import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { one, q } from '../utils/db';

// ── Plan limits in seconds (server-side source of truth) ─────────────────────
const PLAN_LIMITS_SECONDS: Record<string, number> = {
  free: 300, // 5 min
  bronze: 420, // 7 min
  silver: 600, // 10 min
  gold: Infinity,
};

interface PlanRow {
  plan: string;
  plan_expires_at: Date | null;
  total_watch_seconds: number;
}

function effectivePlan(row: PlanRow): string {
  if (row.plan === 'free') return 'free';
  if (row.plan_expires_at && new Date(row.plan_expires_at) < new Date()) return 'free';
  return row.plan;
}

const loadPlan = (userId: string) =>
  one<PlanRow>('select plan, plan_expires_at, total_watch_seconds from users where id = $1', [userId]);

const reply = (plan: string, total: number) => {
  const limit = PLAN_LIMITS_SECONDS[plan];
  return {
    totalWatchSeconds: total,
    limitReached: limit !== Infinity && total >= limit,
    plan,
    planLimit: limit === Infinity ? -1 : limit,
  };
};

// @desc  Increment cumulative watch time and check if the limit is reached
// @route POST /api/watch-time/increment    Body: { seconds }
export const incrementWatchTime = async (req: AuthRequest, res: Response) => {
  try {
    const seconds = Number(req.body.seconds);
    if (!seconds || seconds <= 0 || seconds > 30) {
      return res.status(400).json({ error: 'Invalid seconds value (must be 1–30)' });
    }

    const row = await loadPlan(req.user!._id);
    if (!row) return res.status(404).json({ error: 'User not found' });

    const plan = effectivePlan(row);
    const limit = PLAN_LIMITS_SECONDS[plan];
    const current = row.total_watch_seconds || 0;

    if (limit !== Infinity && current >= limit) return res.json(reply(plan, current));

    // Incremented in the database rather than read-modify-written, so two players
    // in two tabs cannot each overwrite the other's total with a stale number.
    // least() keeps it clamped to the plan's ceiling.
    const updated = await one<{ total_watch_seconds: number }>(
      limit === Infinity
        ? 'update users set total_watch_seconds = total_watch_seconds + $2 where id = $1 returning total_watch_seconds'
        : 'update users set total_watch_seconds = least(total_watch_seconds + $2, $3) where id = $1 returning total_watch_seconds',
      limit === Infinity ? [req.user!._id, seconds] : [req.user!._id, seconds, limit],
    );

    res.json(reply(plan, updated!.total_watch_seconds));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc  Get current cumulative watch time and plan info
// @route GET /api/watch-time/me
export const getWatchTime = async (req: AuthRequest, res: Response) => {
  try {
    const row = await loadPlan(req.user!._id);
    if (!row) return res.status(404).json({ error: 'User not found' });

    const plan = effectivePlan(row);
    // Write the downgrade back, so an expired plan does not have to be recomputed forever.
    if (row.plan !== 'free' && plan === 'free') {
      await q("update users set plan = 'free', plan_expires_at = null where id = $1", [req.user!._id]);
    }

    res.json(reply(plan, row.total_watch_seconds || 0));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc  Reset cumulative watch time (called after a successful plan upgrade)
// @route POST /api/watch-time/reset
export const resetWatchTime = async (req: AuthRequest, res: Response) => {
  try {
    await q('update users set total_watch_seconds = 0 where id = $1', [req.user!._id]);
    res.json({ success: true, totalWatchSeconds: 0 });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
