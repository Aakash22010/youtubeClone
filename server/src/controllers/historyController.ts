import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { doc, one, q } from '../utils/db';
import { isUuid, userBrief } from '../db/videos';

// Record a view (add or refresh the timestamp)
export const addToHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!isUuid(videoId)) return res.status(404).json({ error: 'Video not found' });

    if (!(await one('select 1 from videos where id = $1', [videoId]))) {
      return res.status(404).json({ error: 'Video not found' });
    }

    await q(
      `insert into watch_history (user_id, video_id) values ($1, $2)
       on conflict (user_id, video_id) do update set watched_at = now()`,
      [userId, videoId],
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
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Shaped like the old WatchHistory documents: { videoId: <populated video> }.
    const { rows } = await q(
      `select h.watched_at,
              json_build_object(
                'id', v.id, 'title', v.title, 'description', v.description,
                'thumbnail_url', v.thumbnail_url, 'video_url', v.video_url,
                'duration', v.duration, 'views', v.views, 'category', v.category,
                'created_at', v.created_at, 'updated_at', v.updated_at,
                'user_id', ${userBrief('u')}
              ) as video_id
         from watch_history h
         join videos v on v.id = h.video_id
         join users  u on u.id = v.user_id
        where h.user_id = $1
        order by h.watched_at desc
        limit 100`,
      [userId],
    );
    res.json(doc(rows));
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
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    if (!isUuid(videoId)) return res.json({ message: 'Removed from history' });

    await q('delete from watch_history where user_id = $1 and video_id = $2', [userId, videoId]);
    res.json({ message: 'Removed from history' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Clear all history
export const clearHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    await q('delete from watch_history where user_id = $1', [userId]);
    res.json({ message: 'History cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
