import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Playlist from '../models/Playlist';
import Video from '../models/Video';

// @desc    Get all playlists for current user
// @route   GET /api/playlists
export const getUserPlaylists = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const playlists = await Playlist.find({ userId }).sort('-createdAt');
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get a single playlist by ID
// @route   GET /api/playlists/:id
export const getPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate({
        path: 'videos',
        populate: { path: 'userId', select: 'displayName photoURL' }
      });
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    // Check if private and not owner
    if (!playlist.isPublic && playlist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Create a playlist
// @route   POST /api/playlists
export const createPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, isPublic } = req.body;
    const playlist = await Playlist.create({
      name,
      description,
      userId: req.user?._id,
      videos: [],
      isPublic: isPublic || false,
    });
    res.status(201).json(playlist);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Update a playlist (add/remove videos, change name, etc.)
// @route   PUT /api/playlists/:id
export const updatePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, isPublic, videos } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    if (playlist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (name !== undefined) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (isPublic !== undefined) playlist.isPublic = isPublic;
    if (videos !== undefined) playlist.videos = videos;

    await playlist.save();
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Delete a playlist
// @route   DELETE /api/playlists/:id
export const deletePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    if (playlist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await playlist.deleteOne();
    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Add video to a playlist
// @route   POST /api/playlists/:id/videos
export const addVideoToPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    if (playlist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!playlist.videos.includes(videoId)) {
      playlist.videos.push(videoId);
      await playlist.save();
    }
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get or create watch later playlist
// @route   GET /api/playlists/watch-later
export const getWatchLater = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    let playlist = await Playlist.findOne({ userId, name: 'Watch Later' });
    if (!playlist) {
      playlist = await Playlist.create({
        name: 'Watch Later',
        userId,
        videos: [],
        isPublic: false,
      });
    }
    await playlist.populate({
      path: 'videos',
      populate: { path: 'userId', select: 'displayName photoURL' }
    });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Remove video from playlist
// @route   DELETE /api/playlists/:id/videos/:videoId
export const removeVideoFromPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    if (playlist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    playlist.videos = playlist.videos.filter(id => id.toString() !== req.params.videoId);
    await playlist.save();
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};