import type { PublishedPost } from "@/lib/mock-data";
import type { MetaLiveMetrics } from "@/hooks/useMetaMetrics";
import {
  metaFacebookPostsToPublishedPosts,
  metaInstagramMediaToPublishedPosts,
} from "@/hooks/useMetaMetrics";
import type { YouTubeLiveMetrics } from "@/hooks/useYouTubeMetrics";
import { youtubeVideosToPublishedPosts } from "@/hooks/useYouTubeMetrics";
import {
  filterPublishedInTimeframe,
  getDailySeries,
  getGrowthMatrixForTimeframe,
  getMetrics,
  getPlatformBreakdown as getMockPlatformBreakdown,
  isAllTime,
  timeframeDays,
  type GrowthMatrixRow,
  type MetricRow,
  type PlatformBreakdown,
  type SeriesPoint,
  type Timeframe,
} from "@/lib/timeframe";
import type { Platform, WorkspaceProfile } from "@/lib/workspaces/types";

export interface LiveMetricsBundle {
  youtube?: YouTubeLiveMetrics;
  meta?: MetaLiveMetrics;
}

const LIVE_PLATFORMS = new Set<Platform>(["YT", "FB", "IG"]);

export function hasLiveMetrics(bundle: LiveMetricsBundle) {
  return Boolean(
    bundle.youtube?.connected ||
    bundle.meta?.facebook.connected ||
    bundle.meta?.instagram.connected,
  );
}

export function buildLivePublishedPosts(
  publishedPosts: PublishedPost[],
  bundle: LiveMetricsBundle,
): PublishedPost[] {
  const livePlatforms = new Set<Platform>();
  const livePosts: PublishedPost[] = [];

  if (bundle.youtube?.connected && bundle.youtube.videos.length > 0) {
    livePlatforms.add("YT");
    livePosts.push(...youtubeVideosToPublishedPosts(bundle.youtube.videos));
  }
  if (bundle.meta?.facebook.connected && bundle.meta.facebook.posts.length > 0) {
    livePlatforms.add("FB");
    livePosts.push(...metaFacebookPostsToPublishedPosts(bundle.meta.facebook.posts));
  }
  if (bundle.meta?.instagram.connected && bundle.meta.instagram.media.length > 0) {
    livePlatforms.add("IG");
    livePosts.push(...metaInstagramMediaToPublishedPosts(bundle.meta.instagram.media));
  }

  if (livePlatforms.size === 0) return publishedPosts;

  const mockRemainder = publishedPosts.filter(
    (p) => !p.platforms.some((platform) => livePlatforms.has(platform)),
  );
  return [...livePosts, ...mockRemainder];
}

function liveFollowerTotal(bundle: LiveMetricsBundle) {
  let total = 0;
  if (bundle.youtube?.connected && bundle.youtube.channel) {
    total += bundle.youtube.channel.subscriberCount;
  }
  if (bundle.meta?.facebook.connected && bundle.meta.facebook.page) {
    total += bundle.meta.facebook.page.followerCount;
  }
  if (bundle.meta?.instagram.connected && bundle.meta.instagram.account) {
    total += bundle.meta.instagram.account.followerCount;
  }
  return total;
}

function sumPosts(posts: PublishedPost[]) {
  const views = posts.reduce((sum, p) => sum + p.views, 0);
  const likes = posts.reduce((sum, p) => sum + p.likes, 0);
  const shares = posts.reduce((sum, p) => sum + p.shares, 0);
  const engagement = views > 0 ? (likes + shares) / views : 0;
  return { views, likes, shares, engagement, posts: posts.length };
}

function platformPosts(posts: PublishedPost[], platform: Platform) {
  return posts.filter((p) => p.platforms.includes(platform));
}

function platformIsLive(bundle: LiveMetricsBundle, platform: Platform) {
  if (platform === "YT") return Boolean(bundle.youtube?.connected);
  if (platform === "FB") return Boolean(bundle.meta?.facebook.connected);
  if (platform === "IG") return Boolean(bundle.meta?.instagram.connected);
  return false;
}

function nf(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return n.toLocaleString();
  return Math.round(n).toLocaleString();
}

const FLAT_DELTA = { pct: 0, trend: "flat" as const, label: "" };

/** Merge synced YouTube + Meta data into the 7 dashboard KPI cards. */
export function mergeMetrics(
  tf: Timeframe,
  workspace: WorkspaceProfile,
  bundle: LiveMetricsBundle,
  livePosts: PublishedPost[],
): MetricRow[] {
  const base = getMetrics(tf, workspace);
  if (!hasLiveMetrics(bundle)) return base;

  const factor = timeframeDays(tf) / 30;
  const inRange = filterPublishedInTimeframe(livePosts, tf);
  const liveOnly = inRange.filter((p) =>
    p.platforms.some((platform) => LIVE_PLATFORMS.has(platform)),
  );
  const liveTotals = sumPosts(liveOnly);
  const followers = liveFollowerTotal(bundle);
  const liveNote = "live sync · youtube + meta";
  const noCompareNote = isAllTime(tf) ? liveNote : `${liveNote} · no prior-period compare`;

  return base.map((row) => {
    switch (row.key) {
      case "followers":
        return {
          ...row,
          value: nf(followers),
          delta: "",
          trend: "flat",
          note: noCompareNote,
        };
      case "views":
        return {
          ...row,
          value: nf(liveTotals.views),
          delta: "",
          trend: "flat",
        };
      case "likes":
        return {
          ...row,
          value: nf(liveTotals.likes),
          delta: "",
          trend: "flat",
        };
      case "shares":
        return {
          ...row,
          value: nf(liveTotals.shares),
          delta: "",
          trend: "flat",
        };
      case "engagement":
        return {
          ...row,
          value: `${(liveTotals.engagement * 100).toFixed(1)}%`,
          delta: "",
          trend: "flat",
        };
      case "linkClicks":
      case "profileVisits":
        return {
          ...row,
          value: nf(workspace.metrics[row.key] * factor),
          delta: "",
          trend: "flat",
          note: "demo · API not connected",
        };
      default:
        return row;
    }
  });
}

/** Growth matrix rows with live YT / FB / IG engagement for the selected range. */
export function mergeGrowthMatrixRows(
  tf: Timeframe,
  workspace: WorkspaceProfile,
  bundle: LiveMetricsBundle,
  livePosts: PublishedPost[],
): GrowthMatrixRow[] {
  const rows = getGrowthMatrixForTimeframe(tf, workspace);
  const inRange = filterPublishedInTimeframe(livePosts, tf);

  return rows.map((row) => {
    if (!platformIsLive(bundle, row.platform)) return row;

    const posts = platformPosts(inRange, row.platform);
    if (posts.length === 0) return row;

    const totals = sumPosts(posts);
    return {
      ...row,
      views: totals.views,
      likes: totals.likes,
      shares: totals.shares,
      deltas: {
        views: FLAT_DELTA,
        likes: FLAT_DELTA,
        shares: FLAT_DELTA,
      },
    };
  });
}

export function mergePlatformBreakdown(
  tf: Timeframe,
  workspace: WorkspaceProfile,
  bundle: LiveMetricsBundle,
  livePosts: PublishedPost[],
): PlatformBreakdown[] {
  const mockRows = getMockPlatformBreakdown(tf, workspace);
  const inRange = filterPublishedInTimeframe(livePosts, tf);

  return mockRows.map((row) => {
    const platform = row.platform as Platform;
    if (!platformIsLive(bundle, platform)) return row;

    const posts = platformPosts(inRange, platform);
    if (posts.length === 0) return row;

    const totals = sumPosts(posts);
    return {
      platform: row.platform,
      views: totals.views,
      likes: totals.likes,
      shares: totals.shares,
      engagement: totals.engagement,
      posts: totals.posts,
    };
  });
}

/** Daily chart points aggregated from live post publish dates. */
export function mergeDailySeries(
  tf: Timeframe,
  workspace: WorkspaceProfile,
  bundle: LiveMetricsBundle,
  livePosts: PublishedPost[],
): SeriesPoint[] {
  const mockSeries = getDailySeries(tf, workspace);
  if (!hasLiveMetrics(bundle)) return mockSeries;

  const inRange = filterPublishedInTimeframe(livePosts, tf);
  const liveOnly = inRange.filter((p) =>
    p.platforms.some((platform) => LIVE_PLATFORMS.has(platform)),
  );
  const byDate = new Map<string, { views: number; likes: number; shares: number }>();

  for (const post of liveOnly) {
    const date = post.date.slice(0, 10);
    const bucket = byDate.get(date) ?? { views: 0, likes: 0, shares: 0 };
    bucket.views += post.views;
    bucket.likes += post.likes;
    bucket.shares += post.shares;
    byDate.set(date, bucket);
  }

  const followers = liveFollowerTotal(bundle);

  return mockSeries.map((point) => {
    const live = byDate.get(point.date);
    const useLive = live && (live.views > 0 || live.likes > 0 || live.shares > 0);
    if (!useLive) {
      return {
        ...point,
        views: 0,
        likes: 0,
        shares: 0,
        followers,
      };
    }
    return {
      date: point.date,
      views: live.views,
      likes: live.likes,
      shares: live.shares,
      followers,
    };
  });
}
