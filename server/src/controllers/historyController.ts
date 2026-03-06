import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import WatchHistory from '../models/WatchHistory';
import Video from '../models/Video';

// Record a view (add or update timestamp)
export const addToHistory = async (req: AuthRequest, res: Response) => {
  try {
    const videoId = req.params.videoId;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Upsert: update if exists, otherwise insert
    await WatchHistory.findOneAndUpdate(
      { userId, videoId },
      { watchedAt: new Date() },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'History updated' });
  } catch (error) {
    console.error('Add to history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user's watch history
export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const history = await WatchHistory.find({ userId })
      .populate({
        path: 'videoId',
        populate: { path: 'userId', select: 'displayName photoURL' }
      })
      .sort('-watchedAt')
      .limit(100);

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Remove a specific video from history
export const removeFromHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await WatchHistory.deleteMany({ userId, videoId });
    res.json({ message: 'Removed from history' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Clear all history
export const clearHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await WatchHistory.deleteMany({ userId });
    res.json({ message: 'History cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};