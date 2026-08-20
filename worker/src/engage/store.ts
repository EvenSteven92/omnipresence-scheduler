import { getDb } from "../db/client.js";
import { ensureEngageSchema } from "./schema.js";

export type EngagementThread = {
  id: string;
  client_id: string;
  platform: string;
  kind: string;
  external_id: string;
  parent_external_id: string | null;
  post_external_id: string | null;
  post_title: string | null;
  author_name: string | null;
  author_id: string | null;
  body: string | null;
  unread: number;
  created_at: string | null;
  synced_at: string;
};

export type UpsertThreadInput = {
  clientId: string;
  platform: "YT" | "FB" | "IG";
  externalId: string;
  parentExternalId?: string | null;
  postExternalId?: string | null;
  postTitle?: string | null;
  authorName?: string | null;
  authorId?: string | null;
  body?: string | null;
  createdAt?: string | null;
};

function threadPk(clientId: string, platform: string, externalId: string) {
  return `${clientId}:${platform}:${externalId}`;
}

export function upsertEngagementThread(input: UpsertThreadInput) {
  ensureEngageSchema();
  const id = threadPk(input.clientId, input.platform, input.externalId);
  const existing = getDb()
    .prepare(`SELECT unread FROM engagement_threads WHERE id = ?`)
    .get(id) as { unread: number } | undefined;

  // New threads start unread; existing keep unread flag
  const unread = existing ? existing.unread : 1;

  getDb()
    .prepare(
      `INSERT INTO engagement_threads (
        id, client_id, platform, kind, external_id, parent_external_id,
        post_external_id, post_title, author_name, author_id, body, unread, created_at, synced_at
      ) VALUES (?, ?, ?, 'comment', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(client_id, platform, external_id) DO UPDATE SET
        parent_external_id = excluded.parent_external_id,
        post_external_id = excluded.post_external_id,
        post_title = COALESCE(excluded.post_title, engagement_threads.post_title),
        author_name = excluded.author_name,
        author_id = excluded.author_id,
        body = excluded.body,
        created_at = COALESCE(excluded.created_at, engagement_threads.created_at),
        synced_at = datetime('now')`,
    )
    .run(
      id,
      input.clientId,
      input.platform,
      input.externalId,
      input.parentExternalId ?? null,
      input.postExternalId ?? null,
      input.postTitle ?? null,
      input.authorName ?? null,
      input.authorId ?? null,
      input.body ?? null,
      unread,
      input.createdAt ?? null,
    );

  return id;
}

export function listEngagementThreads(input: {
  clientId: string;
  platform?: string;
  unreadOnly?: boolean;
  limit?: number;
}): EngagementThread[] {
  ensureEngageSchema();
  const limit = input.limit ?? 100;
  const clauses = ["client_id = ?"];
  const params: unknown[] = [input.clientId];
  if (input.platform) {
    clauses.push("platform = ?");
    params.push(input.platform);
  }
  if (input.unreadOnly) clauses.push("unread = 1");
  params.push(limit);

  return getDb()
    .prepare(
      `SELECT * FROM engagement_threads
       WHERE ${clauses.join(" AND ")}
       ORDER BY COALESCE(created_at, synced_at) DESC
       LIMIT ?`,
    )
    .all(...params) as EngagementThread[];
}

export function countUnread(clientId: string): number {
  ensureEngageSchema();
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS n FROM engagement_threads WHERE client_id = ? AND unread = 1`,
    )
    .get(clientId) as { n: number };
  return row.n;
}

export function markThreadRead(id: string, unread = false) {
  ensureEngageSchema();
  getDb()
    .prepare(`UPDATE engagement_threads SET unread = ? WHERE id = ?`)
    .run(unread ? 1 : 0, id);
}

export function getThread(id: string): EngagementThread | null {
  ensureEngageSchema();
  return (
    (getDb().prepare(`SELECT * FROM engagement_threads WHERE id = ?`).get(id) as
      | EngagementThread
      | undefined) ?? null
  );
}

export function markAllRead(clientId: string) {
  ensureEngageSchema();
  getDb()
    .prepare(`UPDATE engagement_threads SET unread = 0 WHERE client_id = ?`)
    .run(clientId);
}
