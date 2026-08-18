-- OmniPresence local SQLite schema (Phase 1)
-- Single-operator, four clients: torcc, first-love, open-eyes, keka

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, -- torcc | first-love | open-eyes | keka
  name TEXT NOT NULL,
  publish_paused INTEGER NOT NULL DEFAULT 0,
  armed INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS connected_accounts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- youtube | facebook | instagram | tiktok | x | rumble
  external_id TEXT,
  display_name TEXT,
  -- refresh/access tokens stored in OS Keychain; only keychain_ref here
  keychain_ref TEXT,
  scopes TEXT,
  expires_at TEXT,
  synced_at TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  UNIQUE (client_id, platform, external_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT,
  hashtags TEXT,
  dropbox_url TEXT,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft|scheduled|publishing|published|failed|partial
  armed INTEGER NOT NULL DEFAULT 1,
  event_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS post_targets (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  external_post_id TEXT,
  error_message TEXT,
  published_at TEXT,
  UNIQUE (post_id, platform)
);

CREATE TABLE IF NOT EXISTS engagement_threads (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'comment', -- comment|mention|reply
  external_id TEXT NOT NULL,
  parent_external_id TEXT,
  post_external_id TEXT,
  author_name TEXT,
  body TEXT,
  unread INTEGER NOT NULL DEFAULT 1,
  created_at TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id, platform, external_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- inbound|outbound
  body TEXT,
  unread INTEGER NOT NULL DEFAULT 1,
  created_at TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (client_id, platform, external_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- critical|warning|info
  title TEXT NOT NULL,
  detail TEXT,
  href TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_cursors (
  id TEXT PRIMARY KEY, -- e.g. torcc:youtube:comments
  cursor TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS worker_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO clients (id, name) VALUES
  ('torcc', 'TORCC'),
  ('first-love', 'First Love'),
  ('open-eyes', 'Open Eyes'),
  ('keka', 'KEKA');
