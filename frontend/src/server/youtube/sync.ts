import { eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { connectedAccounts, youtubeChannelSnapshots, youtubeVideos } from "@/server/db/schema";

import { getYouTubeAccessToken } from "./accounts";
import { fetchMyChannel, fetchRecentUploads } from "./api";
import { DEFAULT_WORKSPACE_ID } from "./config";

export async function syncYouTubeWorkspace(workspaceId = DEFAULT_WORKSPACE_ID) {
  const accessToken = await getYouTubeAccessToken(workspaceId);
  if (!accessToken) {
    throw new Error("YouTube is not connected for this workspace");
  }

  const channel = await fetchMyChannel(accessToken);
  const videos = await fetchRecentUploads(accessToken, channel.uploadsPlaylistId, 30);
  const db = getDb();
  const syncedAt = new Date();

  await db
    .insert(youtubeChannelSnapshots)
    .values({
      workspaceId,
      channelId: channel.channelId,
      channelTitle: channel.channelTitle,
      subscriberCount: channel.subscriberCount,
      viewCount: channel.viewCount,
      videoCount: channel.videoCount,
      syncedAt,
    })
    .onConflictDoUpdate({
      target: youtubeChannelSnapshots.workspaceId,
      set: {
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        subscriberCount: channel.subscriberCount,
        viewCount: channel.viewCount,
        videoCount: channel.videoCount,
        syncedAt,
      },
    });

  for (const video of videos) {
    await db
      .insert(youtubeVideos)
      .values({
        videoId: video.videoId,
        workspaceId,
        channelId: channel.channelId,
        title: video.title,
        publishedAt: new Date(video.publishedAt),
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        thumbnailUrl: video.thumbnailUrl,
        syncedAt,
      })
      .onConflictDoUpdate({
        target: youtubeVideos.videoId,
        set: {
          title: video.title,
          publishedAt: new Date(video.publishedAt),
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          thumbnailUrl: video.thumbnailUrl,
          syncedAt,
        },
      });
  }

  return {
    workspaceId,
    channel,
    videoCount: videos.length,
    syncedAt: syncedAt.toISOString(),
  };
}

export async function syncAllYouTubeWorkspaces() {
  const db = getDb();
  const rows = await db
    .select({ workspaceId: connectedAccounts.workspaceId })
    .from(connectedAccounts)
    .where(eq(connectedAccounts.platform, "YT"));

  const results: Array<
    | { workspaceId: string; videoCount: number; syncedAt: string; channelTitle: string }
    | { workspaceId: string; error: string }
  > = [];

  for (const row of rows) {
    try {
      const result = await syncYouTubeWorkspace(row.workspaceId);
      results.push({
        workspaceId: row.workspaceId,
        videoCount: result.videoCount,
        syncedAt: result.syncedAt,
        channelTitle: result.channel.channelTitle,
      });
    } catch (error) {
      results.push({
        workspaceId: row.workspaceId,
        error: error instanceof Error ? error.message : "YouTube sync failed",
      });
    }
  }

  return { synced: results.filter((r) => !("error" in r)).length, results };
}

export async function getYouTubeMetrics(workspaceId = DEFAULT_WORKSPACE_ID) {
  const db = getDb();
  const [channel] = await db
    .select()
    .from(youtubeChannelSnapshots)
    .where(eq(youtubeChannelSnapshots.workspaceId, workspaceId))
    .limit(1);
  const videos = await db
    .select()
    .from(youtubeVideos)
    .where(eq(youtubeVideos.workspaceId, workspaceId));

  return {
    connected: Boolean(channel),
    channel: channel
      ? {
          channelId: channel.channelId,
          channelTitle: channel.channelTitle,
          subscriberCount: channel.subscriberCount,
          viewCount: channel.viewCount,
          videoCount: channel.videoCount,
          syncedAt: channel.syncedAt.toISOString(),
        }
      : null,
    videos: videos
      .sort((a, b) => b.viewCount - a.viewCount)
      .map((video) => ({
        id: video.videoId,
        title: video.title,
        publishedAt: video.publishedAt.toISOString(),
        views: video.viewCount,
        likes: video.likeCount,
        comments: video.commentCount,
        thumbnailUrl: video.thumbnailUrl,
        engagementRate:
          video.viewCount > 0 ? (video.likeCount + video.commentCount) / video.viewCount : 0,
      })),
  };
}
