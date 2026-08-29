import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { doc, one, q } from '../utils/db';
import { isUuid, userBrief } from '../db/videos';

const FREE_DAILY_LIMIT = 1;

// @desc   Record a download and return the video URL
// @route  POST /api/downloads/:videoId
export const downloadVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    if (!isUuid(videoId)) return res.status(404).json({ error: 'Video not found' });

    const video = await one<{ video_url: string; title: string }>(
      'select video_url, title from videos where id = $1',
      [videoId],
    );
    if (!video) return res.status(404).json({ error: 'Video not found' });

    // Roll the daily counter over in the database, comparing calendar days rather
    // than a 24h window, which is what the old isSameDay() check meant.
    const user = await one<{ is_premium: boolean; daily_download_count: number }>(
      `update users
          set daily_download_count = case
                when last_download_date is null or last_download_date::date < current_date then 0
                else daily_download_count end,
              last_download_date = now()
        where id = $1
        returning is_premium, daily_download_count`,
      [req.user!._id],
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.is_premium && user.daily_download_count >= FREE_DAILY_LIMIT) {
      return res.status(403).json({ error: 'Daily download limit reached', limitReached: true });
    }

    await q('insert into downloads (user_id, video_id) values ($1, $2)', [req.user!._id, videoId]);
    await q('update users set daily_download_count = daily_download_count + 1 where id = $1', [
      req.user!._id,
    ]);

    res.json({ videoUrl: video.video_url, title: video.title });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc   Get the current user's download history
// @route  GET /api/downloads
export const getDownloads = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    const { rows } = await q(
      `select d.downloaded_at,
              json_build_object(
                'id', v.id, 'title', v.title, 'thumbnail_url', v.thumbnail_url,
                'duration', v.duration, 'video_url', v.video_url,
                'user_id', ${userBrief('u')}
              ) as video_id
         from downloads d
         join videos v on v.id = d.video_id
         join users  u on u.id = v.user_id
        where d.user_id = $1
        order by d.downloaded_at desc`,
      [userId],
    );

    const user = await one<{ is_premium: boolean; daily_download_count: number }>(
      'select is_premium, daily_download_count from users where id = $1',
      [userId],
    );

    res.json({
      downloads: doc(rows),
      isPremium: user?.is_premium ?? false,
      dailyDownloadCount: user?.daily_download_count ?? 0,
      dailyLimit: FREE_DAILY_LIMIT,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
