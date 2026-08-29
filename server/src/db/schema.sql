-- Postgres schema, replacing the mongoose models.
-- Safe to re-run: every statement is idempotent.
--
-- Mongo arrays-inside-documents become join tables here. Two of them merge a
-- pair of Mongo arrays: likes and dislikes were mutually exclusive in the old
-- code (liking dropped the dislike), so one row with a sign expresses it and
-- makes the exclusivity a primary key rather than something to remember.

create extension if not exists pgcrypto;

create table if not exists users (
  id                   uuid primary key default gen_random_uuid(),
  email                text        not null unique,
  password_hash        text,                            -- null for Google-only accounts
  google_sub           text unique,                     -- null for password-only accounts
  display_name         text        not null default 'User',
  photo_url            text        not null default '',
  banner               text        not null default '',
  description          text        not null default '',
  is_premium           boolean     not null default false,
  premium_since        timestamptz,
  razorpay_payment_id  text,
  last_download_date   timestamptz,
  daily_download_count integer     not null default 0,
  plan                 text        not null default 'free'
                       check (plan in ('free', 'bronze', 'silver', 'gold')),
  plan_expires_at      timestamptz,
  plan_payment_id      text,
  total_watch_seconds  integer     not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- An account with neither credential could never be signed into again.
  constraint users_has_a_credential check (password_hash is not null or google_sub is not null)
);

create table if not exists videos (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  description   text        not null default '',
  thumbnail_url text        not null default '',
  video_url     text        not null,
  duration      integer     not null default 0,
  views         integer     not null default 0,
  user_id       uuid        not null references users(id) on delete cascade,
  category      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists videos_user_id_idx    on videos (user_id);
create index if not exists videos_created_at_idx on videos (created_at desc);
create index if not exists videos_views_idx      on videos (views desc);
create index if not exists videos_category_idx   on videos (category);

-- kind: 1 = like, -1 = dislike. One row per (video, user) enforces that a user
-- cannot both like and dislike the same video.
create table if not exists video_reactions (
  video_id   uuid        not null references videos(id) on delete cascade,
  user_id    uuid        not null references users(id)  on delete cascade,
  kind       smallint    not null check (kind in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);
create index if not exists video_reactions_user_kind_idx on video_reactions (user_id, kind);

-- The old viewedBy array: which signed-in users have been counted for a view.
create table if not exists video_views (
  video_id  uuid        not null references videos(id) on delete cascade,
  user_id   uuid        not null references users(id)  on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (video_id, user_id)
);

-- Mongo expired these after 24h with a TTL index. Postgres has no TTL, so reads
-- filter on age and writes opportunistically sweep old rows; see anonymousViews.ts.
create table if not exists anonymous_views (
  video_id     uuid        not null references videos(id) on delete cascade,
  anonymous_id text        not null,
  created_at   timestamptz not null default now(),
  primary key (video_id, anonymous_id)
);
create index if not exists anonymous_views_created_at_idx on anonymous_views (created_at);

create table if not exists comments (
  id                uuid primary key default gen_random_uuid(),
  content           text        not null,
  user_id           uuid        not null references users(id)    on delete cascade,
  video_id          uuid        not null references videos(id)   on delete cascade,
  parent_comment_id uuid                 references comments(id) on delete cascade,
  city              text        not null default 'Unknown',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists comments_video_idx  on comments (video_id, created_at desc);
create index if not exists comments_parent_idx on comments (parent_comment_id);

create table if not exists comment_reactions (
  comment_id uuid        not null references comments(id) on delete cascade,
  user_id    uuid        not null references users(id)    on delete cascade,
  kind       smallint    not null check (kind in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- Replaces both the Subscription collection and the subscribers/subscribedTo
-- arrays on the user document, which were two sources of truth for one fact.
create table if not exists subscriptions (
  subscriber_id uuid        not null references users(id) on delete cascade,
  channel_id    uuid        not null references users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (subscriber_id, channel_id),
  constraint no_self_subscription check (subscriber_id <> channel_id)
);
create index if not exists subscriptions_channel_idx on subscriptions (channel_id);

create table if not exists playlists (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  description text,
  user_id     uuid        not null references users(id) on delete cascade,
  is_public   boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists playlists_user_idx on playlists (user_id);

-- position preserves the order of the old Mongo videos array.
create table if not exists playlist_videos (
  playlist_id uuid    not null references playlists(id) on delete cascade,
  video_id    uuid    not null references videos(id)    on delete cascade,
  position    integer not null,
  primary key (playlist_id, video_id)
);
create index if not exists playlist_videos_order_idx on playlist_videos (playlist_id, position);

create table if not exists watch_history (
  user_id    uuid        not null references users(id)  on delete cascade,
  video_id   uuid        not null references videos(id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists watch_history_recent_idx on watch_history (user_id, watched_at desc);

create table if not exists downloads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references users(id)  on delete cascade,
  video_id      uuid        not null references videos(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);
create index if not exists downloads_user_idx on downloads (user_id, downloaded_at desc);

-- Mongoose's { timestamps: true } kept updated_at current on every save. A
-- trigger does the same job here, so no UPDATE can forget it.
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['users', 'videos', 'comments', 'playlists'] loop
    execute format('drop trigger if exists touch_%1$s on %1$s', t);
    execute format('create trigger touch_%1$s before update on %1$s
                    for each row execute function touch_updated_at()', t);
  end loop;
end $$;
