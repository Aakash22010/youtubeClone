import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { doc, one, q } from '../utils/db';
import { toggleReaction } from '../db/reactions';
import { isUuid, userBrief } from '../db/videos';

/** Auto-delete threshold kept from the Mongo version. */
const DISLIKES_BEFORE_REMOVAL = 2;

const COMMENT_FIELDS = `
  c.id, c.content, c.video_id, c.parent_comment_id, c.city, c.created_at, c.updated_at,
  ${userBrief('u')} as user_id,
  coalesce((select json_agg(r.user_id) from comment_reactions r
             where r.comment_id = c.id and r.kind =  1), '[]'::json) as likes,
  coalesce((select json_agg(r.user_id) from comment_reactions r
             where r.comment_id = c.id and r.kind = -1), '[]'::json) as dislikes`;

const COMMENT_FROM = 'from comments c join users u on u.id = c.user_id';

// @desc    Get comments for a video (with nested replies)
// @route   GET /api/comments/video/:videoId
export const getComments = async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    if (!isUuid(videoId)) return res.json([]);

    // Both levels in one round trip; the old code ran a query per top-level comment.
    const { rows } = await q(
      `select ${COMMENT_FIELDS},
              coalesce((select json_agg(reply order by reply->>'created_at')
                          from (select json_build_object(
                                  'id', rc.id, 'content', rc.content, 'video_id', rc.video_id,
                                  'parent_comment_id', rc.parent_comment_id, 'city', rc.city,
                                  'created_at', rc.created_at, 'updated_at', rc.updated_at,
                                  'user_id', ${userBrief('ru')},
                                  'likes', coalesce((select json_agg(r.user_id) from comment_reactions r
                                                      where r.comment_id = rc.id and r.kind =  1), '[]'::json),
                                  'dislikes', coalesce((select json_agg(r.user_id) from comment_reactions r
                                                      where r.comment_id = rc.id and r.kind = -1), '[]'::json)
                                ) as reply
                                  from comments rc join users ru on ru.id = rc.user_id
                                 where rc.parent_comment_id = c.id) replies), '[]'::json) as replies
         ${COMMENT_FROM}
        where c.video_id = $1 and c.parent_comment_id is null
        order by c.created_at desc`,
      [videoId],
    );
    res.json(doc(rows));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Add a comment or reply
// @route   POST /api/comments
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { content, videoId, parentComment, city } = req.body;

    const allowedRegex = /^[a-zA-Z0-9\s.,!?;:\-_'"()\[\]{}@#$%^&*+=<>]+$/u;
    if (typeof content !== 'string' || !allowedRegex.test(content)) {
      return res.status(400).json({ error: 'Comment contains disallowed special characters.' });
    }
    if (!isUuid(videoId)) return res.status(400).json({ error: 'Invalid video id' });
    if (parentComment && !isUuid(parentComment)) {
      return res.status(400).json({ error: 'Invalid parent comment id' });
    }

    const created = await one(
      `insert into comments (content, user_id, video_id, parent_comment_id, city)
            values ($1, $2, $3, $4, $5) returning id`,
      [content, req.user!._id, videoId, parentComment || null, city || 'Unknown'],
    );

    const comment = await one(`select ${COMMENT_FIELDS} ${COMMENT_FROM} where c.id = $1`, [created!.id]);
    res.status(201).json(doc(comment));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Like a comment
// @route   POST /api/comments/:id/like
export const likeComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id) || !(await one('select 1 from comments where id = $1', [id]))) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json(await toggleReaction('comment', id, req.user!._id, 1));
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Dislike a comment (auto-delete after 2 dislikes)
// @route   POST /api/comments/:id/dislike
export const dislikeComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id) || !(await one('select 1 from comments where id = $1', [id]))) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const counts = await toggleReaction('comment', id, req.user!._id, -1);

    if (counts.dislikes >= DISLIKES_BEFORE_REMOVAL) {
      // Replies go with it: the schema cascades on parent_comment_id.
      await q('delete from comments where id = $1', [id]);
      return res.json({ deleted: true, message: 'Comment removed due to low rating' });
    }

    res.json({ ...counts, deleted: false });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// @desc    Delete own comment
// @route   DELETE /api/comments/:id
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(404).json({ error: 'Comment not found' });

    const comment = await one<{ user_id: string }>('select user_id from comments where id = $1', [id]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user_id !== req.user!._id) return res.status(403).json({ error: 'Not authorized' });

    await q('delete from comments where id = $1', [id]);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
