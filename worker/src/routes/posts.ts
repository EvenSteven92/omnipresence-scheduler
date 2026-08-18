import { Hono } from "hono";
import { getDb } from "../db/client.js";

export const postsRoutes = new Hono();

type IncomingPost = {
  id: string;
  title: string;
  caption?: string;
  hashtags?: string;
  dropboxUrl?: string | null;
  previewUrl?: string | null;
  localMediaId?: string | null;
  armed?: boolean;
  status?: string;
  eventId?: string | null;
  platforms: string[];
  platformTimes?: Record<string, string>;
  date: string;
};

/**
 * Upsert scheduled posts + per-platform targets from the UI (localStorage mirror).
 * Body: { clientId, posts: IncomingPost[] }
 */
postsRoutes.post("/schedule", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    clientId?: string;
    posts?: IncomingPost[];
  } | null;

  if (!body?.clientId || !Array.isArray(body.posts)) {
    return c.json({ detail: "clientId and posts[] required" }, 400);
  }

  const db = getDb();
  const upsertPost = db.prepare(
    `INSERT INTO posts (
      id, client_id, title, caption, hashtags, dropbox_url, preview_url, local_media_id,
      status, armed, event_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      caption = excluded.caption,
      hashtags = excluded.hashtags,
      dropbox_url = excluded.dropbox_url,
      preview_url = excluded.preview_url,
      local_media_id = excluded.local_media_id,
      status = excluded.status,
      armed = excluded.armed,
      event_id = excluded.event_id,
      updated_at = datetime('now')`,
  );

  const upsertTarget = db.prepare(
    `INSERT INTO post_targets (
      id, post_id, platform, scheduled_at, status
    ) VALUES (?, ?, ?, ?, 'scheduled')
    ON CONFLICT(post_id, platform) DO UPDATE SET
      scheduled_at = excluded.scheduled_at,
      status = CASE
        WHEN post_targets.status IN ('published', 'publishing') THEN post_targets.status
        ELSE 'scheduled'
      END,
      error_message = CASE
        WHEN post_targets.status IN ('published', 'publishing') THEN post_targets.error_message
        ELSE NULL
      END`,
  );

  const tx = db.transaction((clientId: string, posts: IncomingPost[]) => {
    for (const post of posts) {
      const status = post.status ?? "scheduled";
      const armed = post.armed === false ? 0 : 1;
      upsertPost.run(
        post.id,
        clientId,
        post.title,
        post.caption ?? "",
        post.hashtags ?? "",
        post.dropboxUrl ?? null,
        post.previewUrl ?? null,
        post.localMediaId ?? null,
        status,
        armed,
        post.eventId ?? null,
      );

      const platforms = post.platforms?.length ? post.platforms : [];
      for (const platform of platforms) {
        const when = post.platformTimes?.[platform] ?? post.date;
        const targetId = `${post.id}:${platform}`;
        upsertTarget.run(targetId, post.id, platform, when);
      }
    }
  });

  tx(body.clientId, body.posts);
  return c.json({ ok: true, count: body.posts.length });
});

postsRoutes.get("/due", (c) => {
  const clientId = c.req.query("workspace") ?? c.req.query("clientId");
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.*, p.title, p.client_id
       FROM post_targets t
       JOIN posts p ON p.id = t.post_id
       WHERE t.status IN ('scheduled', 'failed', 'publishing')
         ${clientId ? "AND p.client_id = ?" : ""}
       ORDER BY t.scheduled_at ASC
       LIMIT 100`,
    )
    .all(...(clientId ? [clientId] : [])) as unknown[];
  return c.json({ targets: rows });
});

/** Sync kill-switch / armed flags from the UI. */
postsRoutes.post("/client-ops", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    clientId?: string;
    armed?: boolean;
    publishPaused?: boolean;
  } | null;
  if (!body?.clientId) return c.json({ detail: "clientId required" }, 400);

  getDb()
    .prepare(
      `UPDATE clients SET
        armed = COALESCE(?, armed),
        publish_paused = COALESCE(?, publish_paused),
        updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      body.armed === undefined ? null : body.armed ? 1 : 0,
      body.publishPaused === undefined ? null : body.publishPaused ? 1 : 0,
      body.clientId,
    );

  return c.json({ ok: true });
});
