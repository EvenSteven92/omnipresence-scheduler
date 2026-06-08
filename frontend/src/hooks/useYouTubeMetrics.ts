import { useQuery } from "@tanstack/react-query";

import type { PublishedPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";

export interface YouTubeLiveVideo {
  id: string;
  title: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  thumbnailUrl?: string | null;
  engagementRate: number;
}

export interface YouTubeLiveMetrics {
  connected: boolean;
  channel: {
    channelId: string;
    channelTitle: string;
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    syncedAt: string;
  } | null;
  videos: YouTubeLiveVideo[];
}

export function useYouTubeMetrics(workspaceId: WorkspaceId) {
  return useQuery({
    queryKey: ["youtube-metrics", workspaceId],
    queryFn: async (): Promise<YouTubeLiveMetrics> => {
      const res = await fetch(`/api/youtube/metrics?workspace=${workspaceId}`);
      if (!res.ok) {
        return { connected: false, channel: null, videos: [] };
      }
      return res.json() as Promise<YouTubeLiveMetrics>;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function youtubeVideosToPublishedPosts(videos: YouTubeLiveVideo[]): PublishedPost[] {
  return videos.map((video) => ({
    id: `yt-live-${video.id}`,
    title: video.title,
    platforms: ["YT"],
    date: video.publishedAt,
    views: video.views,
    likes: video.likes,
    shares: video.comments,
    engagementRate: video.engagementRate,
  }));
}