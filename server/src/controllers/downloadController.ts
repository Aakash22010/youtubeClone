import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Video from '../models/Video';

const FREE_DAILY_LIMIT = 1;

// Helper — true if two dates fall on the same calendar day
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

// @desc   Record a download and return the video URL
// @route  POST /api/downloads/:videoId
export const downloadVideo = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const video = await Video.findById(req.params.videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const today = new Date();

    // Reset daily counter if the last download was on a different day
    if (!user.lastDownloadDate || !isSameDay(user.lastDownloadDate, today)) {
      user.dailyDownloadCount = 0;
      user.lastDownloadDate   = today;
    }

    // Enforce free-tier limit
    if (!user.isPremium && user.dailyDownloadCount >= FREE_DAILY_LIMIT) {
      return res.status(403).json({
        error: 'Daily download limit reached',
        limitReached: true,
      });
    }

    // Record download
    user.downloads.push({ videoId: video._id as any, downloadedAt: today });
    user.dailyDownloadCount += 1;
    await user.save();

    res.json({ videoUrl: video.videoUrl, title: video.title });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc   Get the current user's download history (populated)
// @route  GET /api/downloads
export const getDownloads = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!._id).populate({
      path: 'downloads.videoId',
      select: 'title thumbnailUrl duration videoUrl userId',
      populate: { path: 'userId', select: 'displayName photoURL' },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Return newest first
    const sorted = [...user.downloads].reverse();
    res.json({
      downloads: sorted,
      isPremium: user.isPremium,
      dailyDownloadCount: user.dailyDownloadCount,
      dailyLimit: FREE_DAILY_LIMIT,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};