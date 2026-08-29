import { Request, Response } from 'express';
import { doc, q } from '../utils/db';
import { VIDEO_FIELDS, VIDEO_FROM } from '../db/videos';

export const search = async (req: Request, res: Response) => {
  try {
    const { q: term } = req.query;
    if (!term || typeof term !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    // A parameterised ILIKE, so a query full of regex or % characters is matched
    // literally instead of being compiled — the old `new RegExp(q)` let a user's
    // search string act as a pattern against every title in the database.
    const pattern = `%${term.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;

    const [videos, channels] = await Promise.all([
      q(
        `select ${VIDEO_FIELDS} ${VIDEO_FROM}
          where v.title ilike $1 escape '\\' or v.description ilike $1 escape '\\'
          order by v.created_at desc limit 20`,
        [pattern],
      ),
      q(
        `select u.id, u.display_name, u.photo_url, u.description,
                (select count(*) from subscriptions s where s.channel_id = u.id) as subscribers_count
           from users u
          where u.display_name ilike $1 escape '\\'
          limit 10`,
        [pattern],
      ),
    ]);

    res.json({ videos: doc(videos.rows), channels: doc(channels.rows) });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
