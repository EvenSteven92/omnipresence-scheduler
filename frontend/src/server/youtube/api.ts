interface YouTubeChannelListResponse {
  items?: Array<{
    id: string;
    snippet?: { title?: string };
    statistics?: {
      subscriberCount?: string;
      viewCount?: string;
      videoCount?: string;
    };
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
}

interface YouTubePlaylistItemsResponse {
  items?: Array<{
    contentDetails?: { videoId?: string; videoPublishedAt?: string };
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: { medium?: { url?: string } };
    };
  }>;
  nextPageToken?: string;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id: string;
    snippet?: { title?: string; publishedAt?: string; thumbnails?: { medium?: { url?: string } } };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

export interface YouTubeChannelSnapshot {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  uploadsPlaylistId: string;
}

export interface YouTubeVideoSnapshot {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl?: string;
}

async function youtubeGet<T>(path: string, accessToken: string, params: Record<string, string>) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`YouTube API ${path} failed: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMyChannel(accessToken: string): Promise<YouTubeChannelSnapshot> {
  const data = await youtubeGet<YouTubeChannelListResponse>(`channels`, accessToken, {
    part: "snippet,statistics,contentDetails",
    mine: "true",
  });
  const channel = data.items?.[0];
  if (!channel?.id) {
    throw new Error("No YouTube channel found for this Google account");
  }
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error("Could not resolve uploads playlist for YouTube channel");
  }
  return {
    channelId: channel.id,
    channelTitle: channel.snippet?.title ?? "YouTube Channel",
    subscriberCount: Number(channel.statistics?.subscriberCount ?? 0),
    viewCount: Number(channel.statistics?.viewCount ?? 0),
    videoCount: Number(channel.statistics?.videoCount ?? 0),
    uploadsPlaylistId,
  };
}

export async function fetchRecentUploads(
  accessToken: string,
  uploadsPlaylistId: string,
  maxResults = 25,
): Promise<YouTubeVideoSnapshot[]> {
  const playlist = await youtubeGet<YouTubePlaylistItemsResponse>(`playlistItems`, accessToken, {
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: String(maxResults),
  });

  const videoIds = (playlist.items ?? [])
    .map((item) => item.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id));

  if (videoIds.length === 0) return [];

  const videos = await youtubeGet<YouTubeVideosResponse>(`videos`, accessToken, {
    part: "snippet,statistics",
    id: videoIds.join(","),
  });

  return (videos.items ?? []).map((video) => ({
    videoId: video.id,
    channelId: "",
    title: video.snippet?.title ?? "Untitled video",
    publishedAt: video.snippet?.publishedAt ?? new Date().toISOString(),
    viewCount: Number(video.statistics?.viewCount ?? 0),
    likeCount: Number(video.statistics?.likeCount ?? 0),
    commentCount: Number(video.statistics?.commentCount ?? 0),
    thumbnailUrl: video.snippet?.thumbnails?.medium?.url,
  }));
}
