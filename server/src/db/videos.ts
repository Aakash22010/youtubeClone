/**
 * Shared SQL for reading videos in the shape the client expects: the row, its
 * uploader nested under `userId`, and the like/dislike user-id arrays that used
 * to be Mongo arrays on the document.
 */

/** The uploader summary the old code got from .populate('userId', 'displayName photoURL'). */
export const userBrief = (alias: string) =>
  `json_build_object('id', ${alias}.id, 'display_name', ${alias}.display_name, 'photo_url', ${alias}.photo_url)`;

export const VIDEO_FIELDS = `
  v.id, v.title, v.description, v.thumbnail_url, v.video_url, v.duration,
  v.views, v.category, v.created_at, v.updated_at,
  ${userBrief('u')} as user_id,
  coalesce((select json_agg(r.user_id) from video_reactions r
             where r.video_id = v.id and r.kind =  1), '[]'::json) as likes,
  coalesce((select json_agg(r.user_id) from video_reactions r
             where r.video_id = v.id and r.kind = -1), '[]'::json) as dislikes`;

export const VIDEO_FROM = 'from videos v join users u on u.id = v.user_id';

/** Postgres rejects a malformed uuid outright, so ids off the wire are checked first. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID.test(value);
