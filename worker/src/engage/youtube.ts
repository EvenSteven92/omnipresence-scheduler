import { getDb } from "../db/client.js";
import { getYouTubeAccessToken } from "../youtube/accounts.js";
import { upsertEngagementThread } from "./store.js";

interface CommentThreadList {
  items?: Array<{
    id: string;
    snippet?: {
      videoId?: string;
      topLevelComment?: {
        id?: string;
        snippet?: {
          authorDisplayName?: string;
          authorChannelId?: { value?: string };
          textDisplay?: string;
          textOriginal?: string;
          publishedAt?: string;
        };
      };
    };
    replies?: {
      comments?: Array<{
        id: string;
        snippet?: {
          authorDisplayName?: string;
          authorChannelId?: { value?: string };
          textDisplay?: string;
          textOriginal?: string;
          publishedAt?: string;
          parentId?: string;
        };
      }>;
    };
  }>;
}

async function ytGet<T>(path: string, accessToken: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`YouTube ${path} failed: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function syncYouTubeComments(clientId: string) {
  const token = await getYouTubeAccessToken(clientId);
  if (!token) return { synced: 0, skipped: true as const, reason: "YouTube not connected" };

  const videos = getDb()
    .prepare(
      `SELECT video_id, title FROM youtube_videos WHERE client_id = ? ORDER BY published_at DESC LIMIT 15`,
    )
    .all(clientId) as Array<{ video_id: string; title: string }>;

  let synced = 0;
  for (const video of videos) {
    try {
      const data = await ytGet<CommentThreadList>(`commentThreads`, token, {
        part: "snippet,replies",
        videoId: video.video_id,
        maxResults: "25",
        textFormat: "plainText",
      });

      for (const thread of data.items ?? []) {
        const top = thread.snippet?.topLevelComment;
        const topId = top?.id ?? thread.id;
        if (!topId) continue;
        upsertEngagementThread({
          clientId,
          platform: "YT",
          externalId: topId,
          postExternalId: video.video_id,
          postTitle: video.title,
          authorName: top?.snippet?.authorDisplayName ?? null,
          authorId: top?.snippet?.authorChannelId?.value ?? null,
          body: top?.snippet?.textOriginal ?? top?.snippet?.textDisplay ?? null,
          createdAt: top?.snippet?.publishedAt ?? null,
        });
        synced += 1;

        for (const reply of thread.replies?.comments ?? []) {
          upsertEngagementThread({
            clientId,
            platform: "YT",
            externalId: reply.id,
            parentExternalId: reply.snippet?.parentId ?? topId,
            postExternalId: video.video_id,
            postTitle: video.title,
            authorName: reply.snippet?.authorDisplayName ?? null,
            authorId: reply.snippet?.authorChannelId?.value ?? null,
            body: reply.snippet?.textOriginal ?? reply.snippet?.textDisplay ?? null,
            createdAt: reply.snippet?.publishedAt ?? null,
          });
          synced += 1;
        }
      }
    } catch (error) {
      // Comments disabled on some videos — skip
      const msg = error instanceof Error ? error.message : "";
      if (!msg.includes("commentsDisabled") && !msg.includes("forbidden")) {
        console.warn(`[engage:yt] ${video.video_id}`, msg);
      }
    }
  }

  return { synced, skipped: false as const };
}

export async function replyYouTubeComment(clientId: string, parentCommentId: string, text: string) {
  const token = await getYouTubeAccessToken(clientId);
  if (!token) throw new Error("YouTube is not connected");

  const res = await fetch("https://www.googleapis.com/youtube/v3/comments?part=snippet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        parentId: parentCommentId,
        textOriginal: text,
      },
    }),
  });
  if (!res.ok) throw new Error(`YouTube reply failed: ${await res.text()}`);
  const data = (await res.json()) as {
    id: string;
    snippet?: { textOriginal?: string; publishedAt?: string; authorDisplayName?: string };
  };

  upsertEngagementThread({
    clientId,
    platform: "YT",
    externalId: data.id,
    parentExternalId: parentCommentId,
    body: data.snippet?.textOriginal ?? text,
    authorName: data.snippet?.authorDisplayName ?? "You",
    createdAt: data.snippet?.publishedAt ?? new Date().toISOString(),
  });

  return { id: data.id };
}
