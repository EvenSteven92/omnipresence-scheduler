import { useQuery } from "@tanstack/react-query";

import type { PublishedPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";

export interface MetaFacebookPost {
  id: string;
  message: string;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

export interface MetaInstagramMedia {
  id: string;
  caption: string;
  publishedAt: string;
  likes: number;
  comments: number;
  thumbnailUrl?: string | null;
  permalink?: string | null;
  engagementRate: number;
}

export interface MetaLiveMetrics {
  facebook: {
    connected: boolean;
    page: {
      pageId: string;
      pageName: string;
      followerCount: number;
      fanCount: number;
      syncedAt: string;
    } | null;
    posts: MetaFacebookPost[];
  };
  instagram: {
    connected: boolean;
    account: {
      igUserId: string;
      username: string;
      followerCount: number;
      mediaCount: number;
      syncedAt: string;
    } | null;
    media: MetaInstagramMedia[];
  };
}

export function useMetaMetrics(workspaceId: WorkspaceId) {
  return useQuery({
    queryKey: ["meta-metrics", workspaceId],
    queryFn: async (): Promise<MetaLiveMetrics> => {
      const res = await fetch(`/api/meta/metrics?workspace=${workspaceId}`);
      if (!res.ok) {
        return {
          facebook: { connected: false, page: null, posts: [] },
          instagram: { connected: false, account: null, media: [] },
        };
      }
      return res.json() as Promise<MetaLiveMetrics>;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function metaFacebookPostsToPublishedPosts(posts: MetaFacebookPost[]): PublishedPost[] {
  return posts.map((post) => ({
    id: `fb-live-${post.id}`,
    title: post.message || "Facebook post",
    platforms: ["FB"],
    date: post.publishedAt,
    views: post.likes + post.comments + post.shares,
    likes: post.likes,
    shares: post.shares,
    engagementRate: post.engagementRate,
  }));
}

export function metaInstagramMediaToPublishedPosts(media: MetaInstagramMedia[]): PublishedPost[] {
  return media.map((item) => ({
    id: `ig-live-${item.id}`,
    title: item.caption || "Instagram post",
    platforms: ["IG"],
    date: item.publishedAt,
    views: item.likes + item.comments,
    likes: item.likes,
    shares: item.comments,
    engagementRate: item.engagementRate,
  }));
}
