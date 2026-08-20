import { getDb } from "../db/client.js";

/** Ensure engage tables exist on older DBs without full schema re-run. */
export function ensureEngageSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS engagement_threads (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'comment',
      external_id TEXT NOT NULL,
      parent_external_id TEXT,
      post_external_id TEXT,
      post_title TEXT,
      author_name TEXT,
      author_id TEXT,
      body TEXT,
      unread INTEGER NOT NULL DEFAULT 1,
      created_at TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (client_id, platform, external_id)
    );
  `);
}
