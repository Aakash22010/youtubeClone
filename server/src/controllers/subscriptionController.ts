import { Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';

// @desc    Toggle subscription to a channel
// @route   POST /api/subscriptions/:channelId
export const toggleSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const channelId = req.params.channelId;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Prevent self‑subscription
    if (channelId === userId.toString()) {
      return res.status(400).json({ error: 'You cannot subscribe to your own channel' });
    }

    const channel = await User.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isSubscribed = user.subscribedTo.includes(channelId as any);

    if (isSubscribed) {
      // Unsubscribe
      await User.findByIdAndUpdate(userId, {
        $pull: { subscribedTo: channelId }
      });
      await User.findByIdAndUpdate(channelId, {
        $pull: { subscribers: userId }
      });
    } else {
      // Subscribe
      await User.findByIdAndUpdate(userId, {
        $addToSet: { subscribedTo: channelId }
      });
      await User.findByIdAndUpdate(channelId, {
        $addToSet: { subscribers: userId }
      });
    }

    // Get updated subscriber count
    const updatedChannel = await User.findById(channelId);
    res.json({
      subscribed: !isSubscribed,
      subscribersCount: updatedChannel?.subscribers.length || 0
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
    const channelId = req.params.channelId;
    const userId = req.user?._id;

    if (!userId) {
      return res.json({ subscribed: false, subscribersCount: 0 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ subscribed: false, subscribersCount: 0 });
    }

    const subscribed = user.subscribedTo.includes(channelId as any);
    const channel = await User.findById(channelId);
    const subscribersCount = channel?.subscribers.length || 0;

    res.json({ subscribed, subscribersCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};