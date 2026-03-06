import { Request, Response } from 'express';
import Video from '../models/Video';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { OptionalAuthRequest } from '../middleware/optionalAuth';

export const search = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const searchRegex = new RegExp(q, 'i');

    // Search videos by title or description
    const videos = await Video.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex }
      ]
    })
      .populate('userId', 'displayName photoURL')
      .sort('-createdAt')
      .limit(20);

    // Search channels by displayName
    const channels = await User.find({
      displayName: searchRegex
    })
      .select('displayName photoURL subscribers description')
      .limit(10);

    res.json({
      videos,
      channels
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};