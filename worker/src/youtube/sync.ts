import { getDb } from "../db/client.js";
import { getYouTubeAccessToken } from "./accounts.js";
import { fetchMyChannel, fetchRecentUploads } from "./api.js";

export async function syncYouTubeClient(clientId: string) {
  const accessToken = await getYouTubeAccessToken(clientId);
  if (!accessToken) throw new Error("YouTube is not connected for this client");

  const channel = await fetchMyChannel(accessToken);
  const videos = await fetchRecentUploads(accessToken, channel.uploadsPlaylistId, 30);
  const syncedAt = new Date().toISOString();
  const db = getDb();

  db.prepare(
    `INSERT INTO youtube_channel_snapshots (
      client_id, channel_id, channel_title, subscriber_count, view_count, video_count, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET
      channel_id = excluded.channel_id,
      channel_title = excluded.channel_title,
      subscriber_count = excluded.subscriber_count,
      view_count = excluded.view_count,
      video_count = excluded.video_count,
      synced_at = excluded.synced_at`,
  ).run(
    clientId,
    channel.channelId,
    channel.channelTitle,
    channel.subscriberCount,
    channel.viewCount,
    channel.videoCount,
    syncedAt,
  );

  const upsertVideo = db.prepare(
    `INSERT INTO youtube_videos (
      video_id, client_id, channel_id, title, published_at,
      view_count, like_count, comment_count, thumbnail_url, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id) DO UPDATE SET
      title = excluded.title,
      published_at = excluded.published_at,
      view_count = excluded.view_count,
      like_count = excluded.like_count,
      comment_count = excluded.comment_count,
      thumbnail_url = excluded.thumbnail_url,
      synced_at = excluded.synced_at`,
  );

  for (const video of videos) {
    upsertVideo.run(
      video.videoId,
      clientId,
      channel.channelId,
      video.title,
      video.publishedAt,
      video.viewCount,
      video.likeCount,
      video.commentCount,
      video.thumbnailUrl ?? null,
      syncedAt,
    );
  }

  db.prepare(
    `UPDATE connected_accounts SET synced_at = ?, updated_at = datetime('now')
     WHERE client_id = ? AND platform = 'YT'`,
  ).run(syncedAt, clientId);

  return {
    workspaceId: clientId,
    channel,
    videoCount: videos.length,
    syncedAt,
  };
}

export function getYouTubeMetrics(clientId: string) {
  const db = getDb();
  const channel = db
    .prepare(`SELECT * FROM youtube_channel_snapshots WHERE client_id = ?`)
    .get(clientId) as
    | {
        channel_id: string;
        channel_title: string;
        subscriber_count: number;
        view_count: number;
        video_count: number;
        synced_at: string;
      }
    | undefined;

  const videos = db
    .prepare(`SELECT * FROM youtube_videos WHERE client_id = ?`)
    .all(clientId) as Array<{
    video_id: string;
    title: string;
    published_at: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    thumbnail_url: string | null;
  }>;

  return {
    connected: Boolean(channel),
    channel: channel
      ? {
          channelId: channel.channel_id,
          channelTitle: channel.channel_title,
          subscriberCount: channel.subscriber_count,
          viewCount: channel.view_count,
          videoCount: channel.video_count,
          syncedAt: channel.synced_at,
        }
      : null,
    videos: videos
      .sort((a, b) => b.view_count - a.view_count)
      .map((video) => ({
        id: video.video_id,
        title: video.title,
        publishedAt: video.published_at,
        views: video.view_count,
        likes: video.like_count,
        comments: video.comment_count,
        thumbnailUrl: video.thumbnail_url,
        engagementRate:
          video.view_count > 0
            ? (video.like_count + video.comment_count) / video.view_count
            : 0,
      })),
  };
}
