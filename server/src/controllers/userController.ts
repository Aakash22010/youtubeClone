import { Request, Response } from 'express';
import cloudinary from '../utils/cloudinary';
import { AuthRequest } from '../middleware/auth';
import { doc, one, q } from '../utils/db';
import { USER_COLUMNS } from '../db/users';
import { isUuid, userBrief, VIDEO_FIELDS, VIDEO_FROM } from '../db/videos';

// @desc    Get user by ID
// @route   GET /api/users/:id
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: 'User not found' });

    const user = await one(
      `select ${USER_COLUMNS},
              coalesce((select json_agg(${userBrief('s')})
                          from subscriptions sub join users s on s.id = sub.subscriber_id
                         where sub.channel_id = u.id), '[]'::json) as subscribers
         from users u where u.id = $1`,
      [id],
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(doc(user));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get user's videos
// @route   GET /api/users/:id/videos
export const getUserVideos = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.json([]);

    const { rows } = await q(
      `select ${VIDEO_FIELDS} ${VIDEO_FROM} where v.user_id = $1 order by v.created_at desc`,
      [id],
    );
    res.json(doc(rows));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get channels the current user is subscribed to
// @route   GET /api/users/subscriptions
export const getSubscribedChannels = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { rows } = await q(
      `select c.id, c.display_name, c.photo_url, c.description
         from subscriptions s join users c on c.id = s.channel_id
        where s.subscriber_id = $1
        order by s.created_at desc`,
      [userId],
    );
    res.json(doc(rows));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: 'User not found' });
    if (id !== req.user!._id) return res.status(403).json({ error: 'Not authorized' });

    const { displayName, description, avatarUrl, bannerUrl } = req.body;

    // coalesce leaves a column alone when its parameter is null, so one statement
    // covers every combination of supplied fields.
    const updated = await one(
      `update users
          set display_name = coalesce($2, display_name),
              description  = coalesce($3, description),
              photo_url    = coalesce($4, photo_url),
              banner       = coalesce($5, banner)
        where id = $1
        returning id`,
      [
        id,
        displayName || null,
        description === undefined ? null : description,
        avatarUrl || null,
        bannerUrl || null,
      ],
    );
    if (!updated) return res.status(404).json({ error: 'User not found' });

    const user = await one(`select ${USER_COLUMNS} from users u where u.id = $1`, [id]);
    res.json(doc(user));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/** Both image uploads differ only by folder. */
const uploadTo = (folder: string) => async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => (error ? reject(error) : resolve(result as { secure_url: string })),
      );
      uploadStream.end(req.file!.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error(`Upload to ${folder} failed:`, error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const uploadAvatar = uploadTo('youtube-clone/avatars');
export const uploadBanner = uploadTo('youtube-clone/banners');
