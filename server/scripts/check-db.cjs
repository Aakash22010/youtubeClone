/**
 * End-to-end check of the Postgres data layer, against a real database.
 *
 *   DATABASE_URL=postgres://... node scripts/check-db.cjs
 *
 * Applies schema.sql to whatever DATABASE_URL points at, exercises every table
 * and the query shapes the controllers rely on, then removes what it created.
 * Point it at a throwaway database — it writes.
 *
 * With no DATABASE_URL it falls back to the one thing it can check offline: that
 * a failed connection does not kill the process, which is what turned a dead
 * database into a Render "no open ports detected" crash loop.
 */
const assert = require('node:assert');
const net = require('node:net');

async function checkSurvivesDeadDatabase() {
  const connectDB = require('../dist/utils/db').default;
  const listener = net.createServer().listen(0);
  await new Promise((resolve) => listener.on('listening', resolve));

  process.env.DATABASE_URL = 'postgres://u:p@does-not-exist.invalid:5432/none';
  await connectDB();

  assert.ok(listener.listening, 'listener died after a failed DB connect');
  listener.close();
  console.log('ok  failed DB connect left the process alive and still listening');
}

async function checkAgainstPostgres() {
  const { pool, q, one, doc, migrate } = require('../dist/utils/db');
  const { toggleReaction, countReactions } = require('../dist/db/reactions');
  const { loadUser } = require('../dist/db/users');

  await migrate();
  console.log('ok  schema applied');

  // Re-running must be safe: the service applies it on every boot.
  await migrate();
  console.log('ok  schema is idempotent');

  const tag = `check-${Date.now()}`;
  const uid = (
    await one(
      `insert into users (email, password_hash, display_name, photo_url)
       values ($1, 'x', 'Checker', 'http://img/a.png') returning id`,
      [`${tag}@example.test`],
    )
  ).id;
  const otherId = (
    await one(
      `insert into users (email, google_sub, display_name) values ($1, $2, 'Other') returning id`,
      [`${tag}-other@example.test`, `${tag}-sub`],
    )
  ).id;

  // ── the mapper ────────────────────────────────────────────────────────────
  const mapped = doc({ id: 'x', photo_url: 'p', display_name: 'd', parent_comment_id: null });
  assert.deepStrictEqual(mapped, { _id: 'x', photoURL: 'p', displayName: 'd', parentComment: null });
  console.log('ok  row mapper produces the field names the client reads');

  // ── credentials constraint ────────────────────────────────────────────────
  await assert.rejects(
    () => q(`insert into users (email, display_name) values ($1, 'No creds')`, [`${tag}-nc@example.test`]),
    /users_has_a_credential/,
    'a user with no password and no google_sub should be rejected',
  );
  console.log('ok  an account with no way to sign in is rejected');

  // ── videos, and the shape the client expects ──────────────────────────────
  const { VIDEO_FIELDS, VIDEO_FROM } = require('../dist/db/videos');
  const vid = (
    await one(
      `insert into videos (title, video_url, category, user_id, description)
       values ('Check video', 'http://v/1.mp4', 'Music', $1, 'hello') returning id`,
      [uid],
    )
  ).id;

  const video = doc(await one(`select ${VIDEO_FIELDS} ${VIDEO_FROM} where v.id = $1`, [vid]));
  assert.strictEqual(video._id, vid);
  assert.strictEqual(video.thumbnailUrl, '');
  assert.strictEqual(video.userId.displayName, 'Checker');
  assert.strictEqual(video.userId.photoURL, 'http://img/a.png');
  assert.deepStrictEqual(video.likes, []);
  console.log('ok  video reads back in the Mongo document shape');

  // ── reactions toggle, flip and clear ──────────────────────────────────────
  assert.deepStrictEqual(await toggleReaction('video', vid, uid, 1), { likes: 1, dislikes: 0 });
  assert.deepStrictEqual(await toggleReaction('video', vid, uid, -1), { likes: 0, dislikes: 1 },
    'disliking after liking must replace the like, not add to it');
  assert.deepStrictEqual(await toggleReaction('video', vid, uid, -1), { likes: 0, dislikes: 0 },
    'the same reaction twice must clear it');
  await toggleReaction('video', vid, uid, 1);
  await toggleReaction('video', vid, otherId, 1);
  assert.deepStrictEqual(await countReactions('video', vid), { likes: 2, dislikes: 0 });
  console.log('ok  like/dislike toggles, flips and clears');

  // ── anonymous view counting, including the 24h rule ───────────────────────
  const countAnon = () =>
    one(
      `insert into anonymous_views (video_id, anonymous_id) values ($1, 'anon-1')
       on conflict (video_id, anonymous_id) do update set created_at = now()
            where anonymous_views.created_at < now() - interval '24 hours'
       returning 1`,
      [vid],
    );
  assert.ok(await countAnon(), 'first anonymous view should count');
  assert.strictEqual(await countAnon(), null, 'a repeat view within 24h must not count');
  await q(`update anonymous_views set created_at = now() - interval '25 hours' where video_id = $1`, [vid]);
  assert.ok(await countAnon(), 'a view after 24h should count again');
  console.log('ok  anonymous views count once per 24h');

  // ── comments with nested replies ──────────────────────────────────────────
  const cid = (
    await one(`insert into comments (content, user_id, video_id) values ('top', $1, $2) returning id`, [uid, vid])
  ).id;
  await q(`insert into comments (content, user_id, video_id, parent_comment_id) values ('reply', $1, $2, $3)`,
    [otherId, vid, cid]);

  const { rows: topLevel } = await q(
    `select c.id,
            (select count(*) from comments r where r.parent_comment_id = c.id) as reply_count
       from comments c where c.video_id = $1 and c.parent_comment_id is null`,
    [vid],
  );
  assert.strictEqual(topLevel.length, 1, 'a reply must not appear as a top-level comment');
  assert.strictEqual(Number(topLevel[0].reply_count), 1);

  await q('delete from comments where id = $1', [cid]);
  assert.strictEqual(
    Number((await one('select count(*) as n from comments where video_id = $1', [vid])).n),
    0,
    'deleting a comment must take its replies with it',
  );
  console.log('ok  comment replies nest, and cascade on delete');

  // ── subscriptions ─────────────────────────────────────────────────────────
  await q('insert into subscriptions (subscriber_id, channel_id) values ($1, $2)', [uid, otherId]);
  await assert.rejects(
    () => q('insert into subscriptions (subscriber_id, channel_id) values ($1, $1)', [uid]),
    /no_self_subscription/,
    'subscribing to yourself should be rejected by the database',
  );
  const loaded = await loadUser(uid);
  assert.deepStrictEqual(loaded.subscribedTo, [otherId]);
  assert.strictEqual(loaded.email, `${tag}@example.test`);
  assert.ok(!('passwordHash' in loaded), 'password hash must never reach a client');
  assert.ok(!('googleSub' in loaded), 'google subject must never reach a client');
  console.log('ok  subscriptions load, self-subscription blocked, secrets not exposed');

  // ── playlists keep their order ────────────────────────────────────────────
  const vid2 = (
    await one(`insert into videos (title, video_url, user_id) values ('Second', 'http://v/2.mp4', $1) returning id`, [uid])
  ).id;
  const pid = (
    await one(`insert into playlists (name, user_id) values ('Mix', $1) returning id`, [uid])
  ).id;
  await q(
    `insert into playlist_videos (playlist_id, video_id, position)
     select $1, id, ordinality - 1 from unnest($2::uuid[]) with ordinality as t(id, ordinality)`,
    [pid, [vid2, vid]],
  );
  const { rows: ordered } = await q(
    'select video_id from playlist_videos where playlist_id = $1 order by position',
    [pid],
  );
  assert.deepStrictEqual(ordered.map((r) => r.video_id), [vid2, vid], 'playlist order must be preserved');
  console.log('ok  playlist keeps the order the client sent');

  // ── watch time clamps at the plan limit ───────────────────────────────────
  await q('update users set total_watch_seconds = 295 where id = $1', [uid]);
  const clamped = await one(
    'update users set total_watch_seconds = least(total_watch_seconds + 30, 300) where id = $1 returning total_watch_seconds',
    [uid],
  );
  assert.strictEqual(clamped.total_watch_seconds, 300, 'watch time must clamp to the plan limit');
  console.log('ok  watch time clamps to the plan ceiling');

  // ── download day rollover ─────────────────────────────────────────────────
  await q(
    `update users set daily_download_count = 5, last_download_date = now() - interval '2 days' where id = $1`,
    [uid],
  );
  const rolled = await one(
    `update users set daily_download_count = case
        when last_download_date is null or last_download_date::date < current_date then 0
        else daily_download_count end,
        last_download_date = now()
      where id = $1 returning daily_download_count`,
    [uid],
  );
  assert.strictEqual(rolled.daily_download_count, 0, "yesterday's downloads must not count against today");
  console.log('ok  daily download counter rolls over');

  // ── updated_at trigger ────────────────────────────────────────────────────
  const before = (await one('select updated_at from videos where id = $1', [vid])).updated_at;
  await q("update videos set title = 'Renamed' where id = $1", [vid]);
  const after = (await one('select updated_at from videos where id = $1', [vid])).updated_at;
  assert.ok(after > before, 'updated_at should move on every update');
  console.log('ok  updated_at trigger fires');

  // ── search escaping ───────────────────────────────────────────────────────
  await one(`insert into videos (title, video_url, user_id) values ('100% pure', 'http://v/3.mp4', $1) returning id`, [uid]);
  const pattern = `%${'100%'.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  const { rows: found } = await q(`select id from videos where title ilike $1 escape '\\'`, [pattern]);
  assert.strictEqual(found.length, 1, "a literal % in a search term must not act as a wildcard");
  console.log('ok  search treats % and _ as literal characters');

  // ── cleanup: deleting the users cascades everything created above ─────────
  await q('delete from users where id = any($1)', [[uid, otherId]]);
  assert.strictEqual(
    Number((await one('select count(*) as n from videos where user_id = any($1)', [[uid, otherId]])).n),
    0,
    'deleting a user should cascade to their videos',
  );
  console.log('ok  cleanup cascades');

  await pool.end();
}

(async () => {
  if (process.env.DATABASE_URL) {
    await checkAgainstPostgres();
    console.log('\nall database checks passed');
  } else {
    await checkSurvivesDeadDatabase();
    console.log('\noffline check passed (set DATABASE_URL to run the full suite)');
    process.exit(0);
  }
})().catch((error) => {
  console.error('\nCHECK FAILED:', error.message);
  process.exit(1);
});
