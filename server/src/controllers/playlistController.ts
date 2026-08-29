import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { doc, one, q } from '../utils/db';
import { isUuid, userBrief } from '../db/videos';

const WATCH_LATER = 'Watch Later';

/** A playlist with its videos nested in playlist order, each with its uploader. */
const PLAYLIST_FIELDS = `
  p.id, p.name, p.description, p.user_id, p.is_public, p.created_at, p.updated_at,
  coalesce((select json_agg(json_build_object(
             'id', v.id, 'title', v.title, 'description', v.description,
             'thumbnail_url', v.thumbnail_url, 'video_url', v.video_url,
             'duration', v.duration, 'views', v.views, 'category', v.category,
             'created_at', v.created_at, 'updated_at', v.updated_at,
             'user_id', ${userBrief('u')}
           ) order by pv.position)
             from playlist_videos pv
             join videos v on v.id = pv.video_id
             join users  u on u.id = v.user_id
            where pv.playlist_id = p.id), '[]'::json) as videos`;

const loadPlaylist = (id: string) =>
  one(`select ${PLAYLIST_FIELDS} from playlists p where p.id = $1`, [id]);

/** 404 / 403 guard shared by every route that mutates a playlist. */
async function ownedPlaylist(req: AuthRequest, res: Response): Promise<string | null> {
  const { id } = req.params;
  if (!isUuid(id)) {
    res.status(404).json({ error: 'Playlist not found' });
    return null;
  }
  const row = await one<{ user_id: string }>('select user_id from playlists where id = $1', [id]);
  if (!row) {
    res.status(404).json({ error: 'Playlist not found' });
    return null;
  }
  if (row.user_id !== req.user?._id) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return id;
}

// @desc    Get all playlists for current user
// @route   GET /api/playlists
export const getUserPlaylists = async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await q(
      `select ${PLAYLIST_FIELDS} from playlists p where p.user_id = $1 order by p.created_at desc`,
      [req.user!._id],
    );
    res.json(doc(rows));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get or create the Watch Later playlist
// @route   GET /api/playlists/watch-later
export const getWatchLater = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const existing = await one<{ id: string }>(
      'select id from playlists where user_id = $1 and name = $2',
      [userId, WATCH_LATER],
    );
    const id =
      existing?.id ??
      (await one<{ id: string }>(
        'insert into playlists (name, user_id, is_public) values ($1, $2, false) returning id',
        [WATCH_LATER, userId],
      ))!.id;

    res.json(doc(await loadPlaylist(id)));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Get a single playlist by ID
// @route   GET /api/playlists/:id
export const getPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: 'Playlist not found' });

    const playlist = await loadPlaylist(id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(doc(playlist));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Create a playlist
// @route   POST /api/playlists
export const createPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, isPublic } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const created = await one<{ id: string }>(
      'insert into playlists (name, description, user_id, is_public) values ($1, $2, $3, $4) returning id',
      [name, description ?? null, req.user!._id, Boolean(isPublic)],
    );
    res.status(201).json(doc(await loadPlaylist(created!.id)));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Update a playlist (rename, visibility, or replace the whole video list)
// @route   PUT /api/playlists/:id
export const updatePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const id = await ownedPlaylist(req, res);
    if (!id) return;

    const { name, description, isPublic, videos } = req.body;
    await q(
      `update playlists
          set name        = coalesce($2, name),
              description = coalesce($3, description),
              is_public   = coalesce($4, is_public)
        where id = $1`,
      [id, name ?? null, description ?? null, isPublic === undefined ? null : Boolean(isPublic)],
    );

    if (Array.isArray(videos)) {
      const ids = videos.filter(isUuid);
      await q('delete from playlist_videos where playlist_id = $1', [id]);
      if (ids.length) {
        // Position comes from the array index, preserving the order the client sent.
        await q(
          `insert into playlist_videos (playlist_id, video_id, position)
           select $1, id, ordinality - 1 from unnest($2::uuid[]) with ordinality as t(id, ordinality)
           on conflict do nothing`,
          [id, ids],
        );
      }
    }

    res.json(doc(await loadPlaylist(id)));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Delete a playlist
// @route   DELETE /api/playlists/:id
export const deletePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const id = await ownedPlaylist(req, res);
    if (!id) return;
    await q('delete from playlists where id = $1', [id]);
    res.json({ message: 'Playlist deleted' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Add video to a playlist
// @route   POST /api/playlists/:id/videos
export const addVideoToPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const id = await ownedPlaylist(req, res);
    if (!id) return;

    const { videoId } = req.body;
    if (!isUuid(videoId)) return res.status(400).json({ error: 'Invalid video id' });

    await q(
      `insert into playlist_videos (playlist_id, video_id, position)
       select $1, $2, coalesce(max(position) + 1, 0) from playlist_videos where playlist_id = $1
       on conflict do nothing`,
      [id, videoId],
    );
    res.json(doc(await loadPlaylist(id)));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Remove video from playlist
// @route   DELETE /api/playlists/:id/videos/:videoId
export const removeVideoFromPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const id = await ownedPlaylist(req, res);
    if (!id) return;

    const { videoId } = req.params;
    if (!isUuid(videoId)) return res.status(400).json({ error: 'Invalid video id' });

    await q('delete from playlist_videos where playlist_id = $1 and video_id = $2', [id, videoId]);
    res.json(doc(await loadPlaylist(id)));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
