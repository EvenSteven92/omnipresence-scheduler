import { META_GRAPH_VERSION } from "../meta/config.js";
import { getMetaAccount, getMetaPageAccessToken } from "../meta/accounts.js";
import { getDb } from "../db/client.js";
import { upsertEngagementThread } from "./store.js";

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `https://graph.facebook.com/${META_GRAPH_VERSION}${path}`;
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}access_token=${encodeURIComponent(accessToken)}`);
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `Graph GET failed (${res.status})`);
  return data;
}

async function graphPost<T>(path: string, accessToken: string, body: Record<string, string>) {
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}${path}`;
  const params = new URLSearchParams({ ...body, access_token: accessToken });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? `Graph POST failed (${res.status})`);
  return data;
}

type GraphComment = {
  id: string;
  message?: string;
  created_time?: string;
  from?: { id?: string; name?: string };
};

export async function syncFacebookComments(clientId: string) {
  const token = getMetaPageAccessToken(clientId);
  if (!token) return { synced: 0, skipped: true as const, reason: "Facebook not connected" };

  const posts = getDb()
    .prepare(
      `SELECT post_id, message FROM facebook_posts WHERE client_id = ? ORDER BY published_at DESC LIMIT 15`,
    )
    .all(clientId) as Array<{ post_id: string; message: string }>;

  let synced = 0;
  for (const post of posts) {
    try {
      const data = await graphGet<{ data?: GraphComment[] }>(
        `/${post.post_id}/comments?fields=id,message,created_time,from&limit=30`,
        token,
      );
      for (const comment of data.data ?? []) {
        upsertEngagementThread({
          clientId,
          platform: "FB",
          externalId: comment.id,
          postExternalId: post.post_id,
          postTitle: (post.message || "Facebook post").slice(0, 80),
          authorName: comment.from?.name ?? null,
          authorId: comment.from?.id ?? null,
          body: comment.message ?? null,
          createdAt: comment.created_time ?? null,
        });
        synced += 1;
      }
    } catch (error) {
      console.warn(`[engage:fb] ${post.post_id}`, error instanceof Error ? error.message : error);
    }
  }
  return { synced, skipped: false as const };
}

export async function syncInstagramComments(clientId: string) {
  const token = getMetaPageAccessToken(clientId);
  const ig = getMetaAccount(clientId, "IG");
  if (!token || !ig?.external_id) {
    return { synced: 0, skipped: true as const, reason: "Instagram not connected" };
  }

  const media = getDb()
    .prepare(
      `SELECT media_id, caption FROM instagram_media WHERE client_id = ? ORDER BY published_at DESC LIMIT 15`,
    )
    .all(clientId) as Array<{ media_id: string; caption: string }>;

  let synced = 0;
  for (const item of media) {
    try {
      const data = await graphGet<{ data?: GraphComment[] }>(
        `/${item.media_id}/comments?fields=id,text,timestamp,username,from&limit=30`,
        token,
      );
      for (const raw of data.data ?? []) {
        const comment = raw as GraphComment & { text?: string; timestamp?: string; username?: string };
        upsertEngagementThread({
          clientId,
          platform: "IG",
          externalId: comment.id,
          postExternalId: item.media_id,
          postTitle: (item.caption || "Instagram post").slice(0, 80),
          authorName: comment.username ?? comment.from?.name ?? null,
          authorId: comment.from?.id ?? null,
          body: comment.text ?? comment.message ?? null,
          createdAt: comment.timestamp ?? comment.created_time ?? null,
        });
        synced += 1;
      }
    } catch (error) {
      console.warn(`[engage:ig] ${item.media_id}`, error instanceof Error ? error.message : error);
    }
  }
  return { synced, skipped: false as const };
}

export async function replyFacebookComment(clientId: string, commentId: string, message: string) {
  const token = getMetaPageAccessToken(clientId);
  if (!token) throw new Error("Facebook is not connected");
  const data = await graphPost<{ id: string }>(`/${commentId}/comments`, token, { message });
  upsertEngagementThread({
    clientId,
    platform: "FB",
    externalId: data.id,
    parentExternalId: commentId,
    body: message,
    authorName: "You",
    createdAt: new Date().toISOString(),
  });
  return { id: data.id };
}

export async function replyInstagramComment(clientId: string, commentId: string, message: string) {
  const token = getMetaPageAccessToken(clientId);
  if (!token) throw new Error("Instagram is not connected");
  // Reply to a comment
  const data = await graphPost<{ id: string }>(`/${commentId}/replies`, token, { message });
  upsertEngagementThread({
    clientId,
    platform: "IG",
    externalId: data.id,
    parentExternalId: commentId,
    body: message,
    authorName: "You",
    createdAt: new Date().toISOString(),
  });
  return { id: data.id };
}

export async function syncMetaComments(clientId: string) {
  const fb = await syncFacebookComments(clientId);
  const ig = await syncInstagramComments(clientId);
  return {
    synced: (fb.synced ?? 0) + (ig.synced ?? 0),
    facebook: fb,
    instagram: ig,
  };
}
