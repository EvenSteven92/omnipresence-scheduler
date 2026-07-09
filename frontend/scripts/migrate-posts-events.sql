-- Atomic cards + event albums (run in Neon SQL editor when DATABASE_URL is set).

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  hashtags TEXT NOT NULL DEFAULT '',
  transcript TEXT NOT NULL DEFAULT '',
  media_kind TEXT NOT NULL DEFAULT 'video',
  format TEXT NOT NULL DEFAULT 'portrait',
  status TEXT NOT NULL DEFAULT 'scheduled',
  event_id TEXT,
  dropbox_url TEXT,
  preview_url TEXT,
  primary_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS posts_workspace_primary_at_idx
  ON posts (workspace_id, primary_at);

CREATE TABLE IF NOT EXISTS post_targets (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  external_post_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS post_targets_post_platform_uidx
  ON post_targets (post_id, platform);

CREATE INDEX IF NOT EXISTS post_targets_scheduled_at_idx
  ON post_targets (scheduled_at);

CREATE TABLE IF NOT EXISTS content_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_events_workspace_date_idx
  ON content_events (workspace_id, date);
