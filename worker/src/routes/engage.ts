import { Hono } from "hono";
import {
  countUnread,
  getThread,
  listEngagementThreads,
  markAllRead,
  markThreadRead,
} from "../engage/store.js";
import { syncEngageClient } from "../engage/sync.js";
import { replyYouTubeComment } from "../engage/youtube.js";
import { replyFacebookComment, replyInstagramComment } from "../engage/meta.js";
import { ensureEngageSchema } from "../engage/schema.js";

export const engageRoutes = new Hono();

engageRoutes.get("/threads", (c) => {
  ensureEngageSchema();
  const clientId = c.req.query("workspace") ?? c.req.query("clientId") ?? "torcc";
  const platform = c.req.query("platform") ?? undefined;
  const unreadOnly = c.req.query("unread") === "1";
  const threads = listEngagementThreads({ clientId, platform, unreadOnly });
  const unread = countUnread(clientId);
  return c.json({
    clientId,
    unread,
    threads: threads.map((t) => ({
      id: t.id,
      platform: t.platform,
      kind: t.kind,
      externalId: t.external_id,
      parentExternalId: t.parent_external_id,
      postExternalId: t.post_external_id,
      postTitle: t.post_title,
      authorName: t.author_name,
      authorId: t.author_id,
      body: t.body,
      unread: Boolean(t.unread),
      createdAt: t.created_at,
      syncedAt: t.synced_at,
    })),
  });
});

engageRoutes.get("/unread-count", (c) => {
  ensureEngageSchema();
  const clientId = c.req.query("workspace") ?? c.req.query("clientId") ?? "torcc";
  return c.json({ clientId, unread: countUnread(clientId) });
});

engageRoutes.post("/sync", async (c) => {
  const clientId =
    c.req.query("workspace") ??
    c.req.query("clientId") ??
    ((await c.req.json().catch(() => null)) as { clientId?: string } | null)?.clientId ??
    "torcc";
  try {
    const result = await syncEngageClient(clientId);
    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Engage sync failed";
    return c.json({ detail: message }, 502);
  }
});

engageRoutes.post("/reply", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    threadId?: string;
    message?: string;
    clientId?: string;
  } | null;

  if (!body?.threadId || !body.message?.trim()) {
    return c.json({ detail: "threadId and message required" }, 400);
  }

  const thread = getThread(body.threadId);
  if (!thread) return c.json({ detail: "Thread not found" }, 404);

  const clientId = body.clientId ?? thread.client_id;
  const text = body.message.trim();
  // Reply to the comment itself (or its parent if this row is already a reply)
  const parentId = thread.parent_external_id ?? thread.external_id;

  try {
    let result: { id: string };
    if (thread.platform === "YT") {
      result = await replyYouTubeComment(clientId, parentId, text);
    } else if (thread.platform === "FB") {
      result = await replyFacebookComment(clientId, parentId, text);
    } else if (thread.platform === "IG") {
      result = await replyInstagramComment(clientId, parentId, text);
    } else {
      return c.json({ detail: `Unsupported platform ${thread.platform}` }, 400);
    }
    markThreadRead(thread.id, false);
    return c.json({ ok: true, replyId: result.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reply failed";
    return c.json({ detail: message }, 502);
  }
});

engageRoutes.post("/threads/:id/read", (c) => {
  markThreadRead(c.req.param("id"), false);
  return c.json({ ok: true });
});

engageRoutes.post("/read-all", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { clientId?: string } | null;
  const clientId = body?.clientId ?? c.req.query("workspace") ?? "torcc";
  markAllRead(clientId);
  return c.json({ ok: true });
});
