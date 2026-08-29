import { one, q } from '../utils/db';

export type Kind = 1 | -1; // 1 = like, -1 = dislike

/** Whitelisted so the table and column names below can never come from a request. */
const TARGETS = {
  video: { table: 'video_reactions', column: 'video_id' },
  comment: { table: 'comment_reactions', column: 'comment_id' },
} as const;

export interface ReactionCounts {
  likes: number;
  dislikes: number;
}

/**
 * Click the same button twice and the reaction is removed; click the other one
 * and it flips. One row per (target, user) means liking cannot leave a stale
 * dislike behind, which the old array-juggling code had to remember to strip.
 *
 * Done in a single statement so a double-click cannot interleave into two
 * deletes. The DELETE and the INSERT never touch the same row: the delete only
 * matches when the kind is unchanged, and in that case the insert is skipped.
 */
export async function toggleReaction(
  target: keyof typeof TARGETS,
  targetId: string,
  userId: string,
  kind: Kind,
): Promise<ReactionCounts> {
  const { table, column } = TARGETS[target];

  await q(
    `with removed as (
       delete from ${table} where ${column} = $1 and user_id = $2 and kind = $3 returning 1
     )
     insert into ${table} (${column}, user_id, kind)
     select $1, $2, $3 where not exists (select 1 from removed)
     on conflict (${column}, user_id) do update set kind = excluded.kind`,
    [targetId, userId, kind],
  );

  return countReactions(target, targetId);
}

export async function countReactions(
  target: keyof typeof TARGETS,
  targetId: string,
): Promise<ReactionCounts> {
  const { table, column } = TARGETS[target];
  const row = await one<{ likes: string; dislikes: string }>(
    `select count(*) filter (where kind =  1) as likes,
            count(*) filter (where kind = -1) as dislikes
       from ${table} where ${column} = $1`,
    [targetId],
  );
  return { likes: Number(row?.likes ?? 0), dislikes: Number(row?.dislikes ?? 0) };
}
