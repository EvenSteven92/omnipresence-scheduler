import { META_GRAPH_VERSION } from "./config";

interface GraphError {
  error?: { message?: string };
}

async function graphGet<T>(path: string, accessToken: string): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `https://graph.facebook.com/${META_GRAPH_VERSION}${path}`;
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}access_token=${encodeURIComponent(accessToken)}`);
  const data = (await res.json()) as T & GraphError;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Meta Graph API error (${res.status})`);
  }
  return data;
}

export interface MetaPageAccount {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
}

export async function fetchManagedPages(userAccessToken: string) {
  const data = await graphGet<{ data: MetaPageAccount[] }>(
    "/me/accounts?fields=id,name,access_token,instagram_business_account",
    userAccessToken,
  );
  return data.data ?? [];
}

export async function fetchPageSnapshot(pageId: string, pageAccessToken: string) {
  return graphGet<{ id: string; name: string; followers_count?: number; fan_count?: number }>(
    `/${pageId}?fields=id,name,followers_count,fan_count`,
    pageAccessToken,
  );
}

export interface MetaPagePost {
  id: string;
  message?: string;
  created_time: string;
  shares?: { count: number };
  likes?: { summary?: { total_count: number } };
  comments?: { summary?: { total_count: number } };
}

export async function fetchRecentPagePosts(pageId: string, pageAccessToken: string, limit = 25) {
  const data = await graphGet<{ data: MetaPagePost[] }>(
    `/${pageId}/posts?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true)&limit=${limit}`,
    pageAccessToken,
  );
  return data.data ?? [];
}

export async function fetchInstagramProfile(igUserId: string, accessToken: string) {
  return graphGet<{
    id: string;
    username: string;
    followers_count?: number;
    media_count?: number;
  }>(`/${igUserId}?fields=id,username,followers_count,media_count`, accessToken);
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  timestamp: string;
  media_type?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  like_count?: number;
  comments_count?: number;
}

export async function fetchRecentInstagramMedia(igUserId: string, accessToken: string, limit = 25) {
  const data = await graphGet<{ data: InstagramMediaItem[] }>(
    `/${igUserId}/media?fields=id,caption,timestamp,media_type,permalink,thumbnail_url,media_url,like_count,comments_count&limit=${limit}`,
    accessToken,
  );
  return data.data ?? [];
}
