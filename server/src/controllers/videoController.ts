import { Request, Response } from 'express';
import Video from '../models/Video';
import { AuthRequest } from '../middleware/auth';
import cloudinary from '../utils/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import { OptionalAuthRequest } from '../middleware/optionalAuth';
import AnonymousView from '../models/AnonymousView';
import User from '../models/User';


// @desc    Get all videos
// @route   GET /api/videos
export const getVideos = async (req: Request, res: Response) => {
  try {
    const { userId, category } = req.query;
    const filter: any = {};
    if (userId) filter.userId = userId;
    if (category) filter.category = category;

    const videos = await Video.find(filter)
      .populate('userId', 'displayName photoURL')
      .sort('-createdAt')
      .limit(50);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get user's liked videos
// @route   GET /api/videos/liked
export const getLikedVideos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('Fetching liked videos for user:', userId); // Add log

    const videos = await Video.find({ likes: userId })
      .populate('userId', 'displayName photoURL')
      .sort('-updatedAt');

    res.json(videos);
  } catch (error) {
    console.error('Error in getLikedVideos:', error); // Full error log
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get videos from subscribed channels
// @route   GET /api/videos/subscriptions
export const getSubscribedVideos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get the list of channels the user subscribes to
    const user = await User.findById(userId).select('subscribedTo');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscribedChannelIds = user.subscribedTo;

    if (subscribedChannelIds.length === 0) {
      return res.json([]);
    }

    // Find videos from those channels, populate user info, sort by newest
    const videos = await Video.find({ userId: { $in: subscribedChannelIds } })
      .populate('userId', 'displayName photoURL')
      .sort('-createdAt')
      .limit(100);

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get single video (increment views)
// @route   GET /api/videos/:id
export const getVideo = async (req: OptionalAuthRequest, res: Response) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const user = req.user;
    const anonymousId = req.anonymousId;
    let shouldIncrement = false;

    if (user) {
      // Authenticated user: check if already viewed
      if (!video.viewedBy.includes(user._id)) {
        video.viewedBy.push(user._id);
        shouldIncrement = true;
      }
    } else if (anonymousId) {
      // Anonymous user: check if this anonymous ID has viewed recently
      const existingView = await AnonymousView.findOne({
        videoId: video._id,
        anonymousId,
      });
      if (!existingView) {
        await AnonymousView.create({ videoId: video._id, anonymousId });
        shouldIncrement = true;
      }
    } else {
      // No identification – do not count view (or count once per IP if you prefer)
      // We rely on frontend to always send an anonymous ID.
    }

    if (shouldIncrement) {
      video.views += 1;
    }

    await video.save();
    await video.populate('userId', 'displayName photoURL subscribers');
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get trending videos (most viewed)
// @route   GET /api/videos/trending
export const getTrendingVideos = async (req: Request, res: Response) => {
  try {
    const videos = await Video.find()
      .populate('userId', 'displayName photoURL')
      .sort('-views') // most viewed first
      .limit(50);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Create a video
// @route   POST /api/videos
export const createVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, thumbnailUrl, videoUrl, duration, category } = req.body;
    
    if (!title || !videoUrl || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const video = await Video.create({
      title,
      description: description || '',
      thumbnailUrl: thumbnailUrl || '',
      videoUrl,
      duration: duration || 0,
      category,
      userId: req.user!._id,
    });

    res.status(201).json(video);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to save video metadata' });
  }
};

// @desc    Like a video
// @route   POST /api/videos/:id/like
export const likeVideo = async (req: AuthRequest, res: Response) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    const userId = req.user!._id;
    if (video.likes.some(id => id.toString() === userId.toString())) {
      video.likes = video.likes.filter(id => id.toString() !== userId.toString());
    } else {
      video.likes.push(userId);
      video.dislikes = video.dislikes.filter(id => id.toString() !== userId.toString());
    }
    await video.save();
    res.json({ likes: video.likes.length, dislikes: video.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Dislike a video
// @route   POST /api/videos/:id/dislike
export const dislikeVideo = async (req: AuthRequest, res: Response) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    const userId = req.user!._id;
    if (video.dislikes.some(id => id.toString() === userId.toString())) {
      video.dislikes = video.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      video.dislikes.push(userId);
      video.likes = video.likes.filter(id => id.toString() !== userId.toString()); // remove like if present
    }
    await video.save();
    res.json({ likes: video.likes.length, dislikes: video.dislikes.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Upload video to Cloudinary (separate endpoint)
// @route   POST /api/upload/video
export const uploadVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          resource_type: 'video', 
          folder: 'youtube-clone/videos',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    res.json({ 
      url: result.secure_url, 
      duration: Math.round(result.duration) 
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
};

// @desc    Upload thumbnail to Cloudinary
// @route   POST /api/upload/thumbnail
export const uploadThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No thumbnail file uploaded' });
    }

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'youtube-clone/thumbnails' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({ error: 'Failed to upload thumbnail' });
  }
};