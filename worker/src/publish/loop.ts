import { getDb, setMeta } from "../db/client.js";
import { publishMetaTarget } from "./meta.js";

type DueRow = {
  target_id: string;
  post_id: string;
  platform: string;
  client_id: string;
  title: string;
  caption: string | null;
  dropbox_url: string | null;
  preview_url: string | null;
  local_media_id: string | null;
  armed: number;
  publish_paused: number;
  client_armed: number;
};

function addNotification(input: {
  clientId: string;
  severity: string;
  title: string;
  detail: string;
  href?: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO notifications (id, client_id, severity, title, detail, href, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
    )
    .run(
      `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      input.clientId,
      input.severity,
      input.title,
      input.detail,
      input.href ?? "/queue",
    );
}

export async function runPublishDueOnce(): Promise<{
  checked: number;
  published: number;
  failed: number;
  skipped: number;
}> {
  const db = getDb();
  const nowIso = new Date().toISOString();

  const due = db
    .prepare(
      `SELECT
        t.id AS target_id,
        t.post_id AS post_id,
        t.platform AS platform,
        p.client_id AS client_id,
        p.title AS title,
        p.caption AS caption,
        p.dropbox_url AS dropbox_url,
        p.preview_url AS preview_url,
        p.local_media_id AS local_media_id,
        p.armed AS armed,
        c.publish_paused AS publish_paused,
        c.armed AS client_armed
      FROM post_targets t
      JOIN posts p ON p.id = t.post_id
      JOIN clients c ON c.id = p.client_id
      WHERE t.status = 'scheduled'
        AND t.scheduled_at <= ?
        AND t.platform IN ('FB', 'IG')
      ORDER BY t.scheduled_at ASC
      LIMIT 20`,
    )
    .all(nowIso) as DueRow[];

  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of due) {
    if (!row.armed || !row.client_armed || row.publish_paused) {
      skipped += 1;
      continue;
    }

    db.prepare(`UPDATE post_targets SET status = 'publishing' WHERE id = ?`).run(row.target_id);

    try {
      const result = await publishMetaTarget({
        clientId: row.client_id,
        platform: row.platform,
        caption: row.caption ?? "",
        dropboxUrl: row.dropbox_url,
        previewUrl: row.preview_url,
        localMediaId: row.local_media_id,
        title: row.title,
      });

      db.prepare(
        `UPDATE post_targets SET
          status = 'published',
          external_post_id = ?,
          error_message = NULL,
          published_at = datetime('now')
         WHERE id = ?`,
      ).run(result.externalPostId, row.target_id);

      // Roll up parent post status
      const remaining = db
        .prepare(
          `SELECT COUNT(*) AS n FROM post_targets WHERE post_id = ? AND status IN ('scheduled', 'publishing', 'failed')`,
        )
        .get(row.post_id) as { n: number };
      const anyFailed = db
        .prepare(`SELECT COUNT(*) AS n FROM post_targets WHERE post_id = ? AND status = 'failed'`)
        .get(row.post_id) as { n: number };
      const parentStatus =
        remaining.n === 0 ? (anyFailed.n > 0 ? "partial" : "published") : "scheduled";
      db.prepare(`UPDATE posts SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(
        parentStatus,
        row.post_id,
      );

      published += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publish failed";
      db.prepare(
        `UPDATE post_targets SET status = 'failed', error_message = ? WHERE id = ?`,
      ).run(message, row.target_id);
      db.prepare(`UPDATE posts SET status = 'failed', updated_at = datetime('now') WHERE id = ?`).run(
        row.post_id,
      );
      addNotification({
        clientId: row.client_id,
        severity: "critical",
        title: `Publish failed · ${row.platform}`,
        detail: `${row.title}: ${message}`,
        href: "/queue",
      });
      failed += 1;
    }
  }

  setMeta("last_publish_run_at", new Date().toISOString());
  return { checked: due.length, published, failed, skipped };
}
