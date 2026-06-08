-- Run in Neon SQL editor if you already ran init-db.sql before Meta support shipped.

CREATE TABLE IF NOT EXISTS facebook_page_snapshots (
  workspace_id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  follower_count INTEGER NOT NULL DEFAULT 0,
  fan_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_posts (
  post_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_account_snapshots (
  workspace_id TEXT PRIMARY KEY,
  ig_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  follower_count INTEGER NOT NULL DEFAULT 0,
  media_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_media (
  media_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  ig_user_id TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL DEFAULT 'UNKNOWN',
  permalink TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);