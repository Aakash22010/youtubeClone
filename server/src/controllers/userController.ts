import { Request, Response } from 'express';
import cloudinary from '../utils/cloudinary';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Video from '../models/Video';

// @desc    Get user by ID
// @route   GET /api/users/:id
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-firebaseUid') // exclude firebaseUid from response
      .populate('subscribers', 'displayName photoURL');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get user's videos
// @route   GET /api/users/:id/videos
export const getUserVideos = async (req: Request, res: Response) => {
  try {
    const videos = await Video.find({ userId: req.params.id })
      .populate('userId', 'displayName photoURL')
      .sort('-createdAt');
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get channels the current user is subscribed to
// @route   GET /api/users/subscriptions
export const getSubscribedChannels = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(userId).populate('subscribedTo', 'displayName photoURL description');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.subscribedTo);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Update user profile (optional)
// @route   PUT /api/users/:id
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { displayName, description, avatarUrl, bannerUrl } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Only allow user to update their own profile
    if (user._id.toString() !== req.user!._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (displayName) user.displayName = displayName;
    if (description !== undefined) user.description = description;
    if (avatarUrl) user.photoURL = avatarUrl;
    if (bannerUrl) user.banner = bannerUrl;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'youtube-clone/avatars' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    });
    res.json({ url: (result as any).secure_url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
};
export const uploadBanner = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'youtube-clone/banners' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    });
    res.json({ url: (result as any).secure_url });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({ error: 'Failed to upload banner' });
  }
};

