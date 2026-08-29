import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { one } from '../utils/db';
import { isUuid } from '../db/videos';

const countSubscribers = async (channelId: string) =>
  Number(
    (await one<{ count: string }>(
      'select count(*) as count from subscriptions where channel_id = $1',
      [channelId],
    ))?.count ?? 0,
  );

// @desc    Toggle subscription to a channel
// @route   POST /api/subscriptions/:channelId
export const toggleSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!isUuid(channelId)) return res.status(404).json({ error: 'Channel not found' });
    if (channelId === userId) {
      return res.status(400).json({ error: 'You cannot subscribe to your own channel' });
    }
    if (!(await one('select 1 from users where id = $1', [channelId]))) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Delete-then-insert-if-nothing-was-deleted, in one statement, so a double
    // click cannot end up subscribing twice or cancelling itself.
    const inserted = await one(
      `with removed as (
         delete from subscriptions where subscriber_id = $1 and channel_id = $2 returning 1
       )
       insert into subscriptions (subscriber_id, channel_id)
       select $1, $2 where not exists (select 1 from removed)
       on conflict do nothing
       returning 1`,
      [userId, channelId],
    );

    res.json({
      subscribed: Boolean(inserted),
      subscribersCount: await countSubscribers(channelId),
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @desc    Get subscription status for a channel
// @route   GET /api/subscriptions/status/:channelId
export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?._id;
    if (!isUuid(channelId)) return res.json({ subscribed: false, subscribersCount: 0 });

    const subscribed = userId
      ? Boolean(
          await one('select 1 from subscriptions where subscriber_id = $1 and channel_id = $2', [
            userId,
            channelId,
          ]),
        )
      : false;

    res.json({ subscribed, subscribersCount: await countSubscribers(channelId) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
