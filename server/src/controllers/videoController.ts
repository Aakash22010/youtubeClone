import { Request, Response } from 'express';
import { UploadApiResponse } from 'cloudinary';
import { AuthRequest } from '../middleware/auth';
import { OptionalAuthRequest } from '../middleware/optionalAuth';
import cloudinary from '../utils/cloudinary';
import { doc, one, q } from '../utils/db';
import { toggleReaction } from '../db/reactions';
import { isUuid, VIDEO_FIELDS, VIDEO_FROM } from '../db/videos';

// @desc    Get all videos
// @route   GET /api/videos
export const getVideos = async (req: Request, res: Response) => {
  try {
    const { userId, category } = req.query;
    const where: string[] = [];
    const params: unknown[] = [];

    if (userId) {
      if (!isUuid(userId)) return res.json([]);
      params.push(userId);
      where.push(`v.user_id = $${params.length}`);
    }
    if (category) {
      params.push(category);
      where.push(`v.category = $${params.length}`);
    }

    const { rows } = await q(
      `select ${VIDEO_FIELDS} ${VIDEO_FROM}
       ${where.length ? `where ${where.join(' and ')}` : ''}
       order by v.created_at desc limit 50`,
      params,
    );
    res.json(doc(rows));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get user's liked videos
// @route   GET /api/videos/liked
export const getLikedVideos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { rows } = await q(
      `select ${VIDEO_FIELDS} ${VIDEO_FROM}
         join video_reactions lr on lr.video_id = v.id and lr.user_id = $1 and lr.kind = 1
        order by lr.created_at desc`,
      [userId],
    );
    res.json(doc(rows));
  } catch (error) {
    console.error('Error in getLikedVideos:', error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get videos from subscribed channels
// @route   GET /api/videos/subscriptions
export const getSubscribedVideos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { rows } = await q(
      `select ${VIDEO_FIELDS} ${VIDEO_FROM}
        where v.user_id in (select channel_id from subscriptions where subscriber_id = $1)
        order by v.created_at desc limit 100`,
      [userId],
    );
    res.json(doc(rows));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get trending videos (most viewed)
// @route   GET /api/videos/trending
export const getTrendingVideos = async (_req: Request, res: Response) => {
  try {
    const { rows } = await q(
      `select ${VIDEO_FIELDS} ${VIDEO_FROM} order by v.views desc limit 50`,
    );
    res.json(doc(rows));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get single video (increment views)
// @route   GET /api/videos/:id
export const getVideo = async (req: OptionalAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: 'Video not found' });

    const exists = await one('select 1 from videos where id = $1', [id]);
    if (!exists) return res.status(404).json({ error: 'Video not found' });

    let counted = null;
    if (req.user) {
      // One view per signed-in user, ever — the old viewedBy array.
      counted = await one(
        `insert into video_views (video_id, user_id) values ($1, $2)
         on conflict do nothing returning 1`,
        [id, req.user._id],
      );
    } else if (req.anonymousId) {
      // One view per anonymous id per 24h. Mongo did this with a TTL index; here
      // the upsert refreshes a row only once it is old enough, and returns a row
      // only when it actually inserted or refreshed one.
      counted = await one(
        `insert into anonymous_views (video_id, anonymous_id) values ($1, $2)
         on conflict (video_id, anonymous_id) do update set created_at = now()
              where anonymous_views.created_at < now() - interval '24 hours'
         returning 1`,
        [id, req.anonymousId],
      );
    }

    if (counted) await q('update videos set views = views + 1 where id = $1', [id]);

    const video = await one(
      `select ${VIDEO_FIELDS},
              (select count(*) from subscriptions s where s.channel_id = u.id) as subscribers_count
         ${VIDEO_FROM} where v.id = $1`,
      [id],
    );
    res.json(doc(video));
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

    const created = await one(
      `insert into videos (title, description, thumbnail_url, video_url, duration, category, user_id)
            values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [title, description || '', thumbnailUrl || '', videoUrl, Number(duration) || 0, category, req.user!._id],
    );

    const video = await one(`select ${VIDEO_FIELDS} ${VIDEO_FROM} where v.id = $1`, [created!.id]);
    res.status(201).json(doc(video));
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to save video metadata' });
  }
};

// @desc    Like a video
// @route   POST /api/videos/:id/like
export const likeVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: 'Video not found' });
    if (!(await one('select 1 from videos where id = $1', [id]))) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.json(await toggleReaction('video', id, req.user!._id, 1));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Dislike a video
// @route   POST /api/videos/:id/dislike
export const dislikeVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: 'Video not found' });
    if (!(await one('select 1 from videos where id = $1', [id]))) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.json(await toggleReaction('video', id, req.user!._id, -1));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Upload video to Cloudinary (separate endpoint)
// @route   POST /api/upload/video
export const uploadVideo = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'youtube-clone/videos' },
        (error, result) => (error ? reject(error) : resolve(result!)),
      );
      uploadStream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url, duration: Math.round(result.duration) });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
};

// @desc    Upload thumbnail to Cloudinary
// @route   POST /api/upload/thumbnail
export const uploadThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No thumbnail file uploaded' });

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'youtube-clone/thumbnails' },
        (error, result) => (error ? reject(error) : resolve(result!)),
      );
      uploadStream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({ error: 'Failed to upload thumbnail' });
  }
};
