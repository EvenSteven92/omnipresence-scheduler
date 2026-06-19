import { isWithinPastDays, todayStart } from "@/lib/demo-clock";
import type { PublishedPost } from "@/lib/mock-data";
import type {
  ContentEvent,
  GrowthRow,
  Platform,
  WorkspaceMetricsBase,
  WorkspaceProfile,
} from "@/lib/workspaces/types";

/**
 * Shared timeframe primitive used by Dashboard + Analytics.
 *
 * A Timeframe is either a named preset, a custom number+unit, or all-time.
 * Mock metric scaling and trend deltas derive from `days` and `isAllTime`.
 */

export type TimeframeUnit = "day" | "week" | "month" | "year";

export type Timeframe =
  | { kind: "preset"; preset: "1w" | "1m" | "3m" | "6m" | "1y" }
  | { kind: "custom"; count: number; unit: TimeframeUnit }
  | { kind: "all" };

export const PRESETS: { id: "1w" | "1m" | "3m" | "6m" | "1y"; label: string; days: number }[] = [
  { id: "1w", label: "1 week", days: 7 },
  { id: "1m", label: "1 month", days: 30 },
  { id: "3m", label: "3 months", days: 90 },
  { id: "6m", label: "6 months", days: 180 },
  { id: "1y", label: "1 year", days: 365 },
];

const UNIT_DAYS: Record<TimeframeUnit, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

export function timeframeDays(tf: Timeframe): number {
  if (tf.kind === "preset") return PRESETS.find((p) => p.id === tf.preset)!.days;
  if (tf.kind === "custom") return Math.max(1, tf.count) * UNIT_DAYS[tf.unit];
  return 365 * 3; // "all-time" — generous window for mock-data scaling
}

export function timeframeLabel(tf: Timeframe): string {
  if (tf.kind === "preset") return PRESETS.find((p) => p.id === tf.preset)!.label;
  if (tf.kind === "custom") {
    const unit = tf.count === 1 ? tf.unit : `${tf.unit}s`;
    return `${tf.count} ${unit}`;
  }
  return "all-time";
}

export function isAllTime(tf: Timeframe): boolean {
  return tf.kind === "all";
}

// ─── Metric scaling (mock, per workspace) ─────────────────────────────────

export interface MetricRow {
  key: keyof Omit<WorkspaceMetricsBase, "delta">;
  label: string;
  value: string;
  /** Pre-formatted delta string with sign + unit. Empty when isAllTime. */
  delta: string;
  trend: "up" | "down" | "flat";
  note?: string;
}

function nf(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return n.toLocaleString();
  return Math.round(n).toLocaleString();
}

function metricHelpers(tf: Timeframe) {
  const all = isAllTime(tf);
  const days = timeframeDays(tf);
  const factor = days / 30;

  function delta(pct: number, unit: "%" | "pp"): string {
    if (all) return "";
    const sign = pct > 0 ? "+" : "";
    if (unit === "pp") return `${sign}${pct.toFixed(1)} pp`;
    return `${sign}${pct.toFixed(1)}%`;
  }
  function trend(pct: number): "up" | "down" | "flat" {
    if (all) return "flat";
    if (Math.abs(pct) < 0.05) return "flat";
    return pct > 0 ? "up" : "down";
  }

  return { all, factor, delta, trend };
}

/**
 * Returns the 7 dashboard metrics scaled for the given timeframe and workspace.
 */
export function getMetrics(tf: Timeframe, workspace: WorkspaceProfile): MetricRow[] {
  const base = workspace.metrics;
  const { factor, delta, trend } = metricHelpers(tf);
  const platformList = workspace.platforms.join(", ");

  return [
    {
      key: "followers",
      label: "Total Followers",
      value: nf(base.followers),
      delta: delta(base.delta.followers, "%"),
      trend: trend(base.delta.followers),
      note: `${workspace.name} · connected: ${platformList}`,
    },
    {
      key: "views",
      label: "Total Views",
      value: nf(base.views * factor),
      delta: delta(base.delta.views, "%"),
      trend: trend(base.delta.views),
    },
    {
      key: "likes",
      label: "Total Likes",
      value: nf(base.likes * factor),
      delta: delta(base.delta.likes, "%"),
      trend: trend(base.delta.likes),
    },
    {
      key: "shares",
      label: "Total Shares",
      value: nf(base.shares * factor),
      delta: delta(base.delta.shares, "%"),
      trend: trend(base.delta.shares),
    },
    {
      key: "engagement",
      label: "Engagement Rate",
      value: `${(base.engagement * 100).toFixed(1)}%`,
      delta: delta(base.delta.engagement, "pp"),
      trend: trend(base.delta.engagement),
    },
    {
      key: "linkClicks",
      label: "Link Clicks",
      value: nf(base.linkClicks * factor),
      delta: delta(base.delta.linkClicks, "%"),
      trend: trend(base.delta.linkClicks),
    },
    {
      key: "profileVisits",
      label: "Profile Visits",
      value: nf(base.profileVisits * factor),
      delta: delta(base.delta.profileVisits, "%"),
      trend: trend(base.delta.profileVisits),
    },
  ];
}

// ─── Time-series generation for charts ──────────────────────────────────────

export interface SeriesPoint {
  date: string; // ISO date (day granularity)
  views: number;
  likes: number;
  shares: number;
  followers: number;
}

/**
 * Deterministic per-day mock data — seeded so values stay stable across renders.
 * Builds a daily series for the requested timeframe with a slight upward drift
 * and weekday seasonality (Sat/Sun bumps).
 */
export function filterPublishedInTimeframe(
  posts: PublishedPost[],
  tf: Timeframe,
  anchor: Date = todayStart(),
): PublishedPost[] {
  if (isAllTime(tf)) return posts;
  const days = timeframeDays(tf);
  return posts.filter((p) => isWithinPastDays(p.date, days, anchor));
}

export function filterEventsInTimeframe(
  events: ContentEvent[],
  tf: Timeframe,
  anchor: Date = todayStart(),
): ContentEvent[] {
  if (isAllTime(tf)) return events;
  const days = timeframeDays(tf);
  return events.filter((e) => isWithinPastDays(e.date, days, anchor));
}

export function getDailySeries(
  tf: Timeframe,
  workspace: WorkspaceProfile,
  anchor: Date = todayStart(),
): SeriesPoint[] {
  const days = Math.min(timeframeDays(tf), 365 * 2); // cap series length
  const out: SeriesPoint[] = [];
  const wsSeed = workspace.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const scale = Math.max(1, workspace.metrics.views / 12_480);
  const baseViews = Math.round(380 * scale);
  const baseLikes = Math.round(28 * scale);
  const baseShares = Math.round(9 * scale);
  let followers = workspace.metrics.followers - Math.round(days * (80 + (wsSeed % 40)));

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const seed = (d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate() + wsSeed) % 97;
    const noise = (seed / 97 - 0.5) * 0.4 + 1; // 0.8..1.2
    const drift = 1 + (days - i) / (days * 4); // gentle upward trend
    const weekendBoost = weekend ? 1.25 : 1;

    const views = Math.round(baseViews * noise * drift * weekendBoost);
    const likes = Math.round(baseLikes * noise * drift * weekendBoost);
    const shares = Math.round(baseShares * noise * drift * weekendBoost);
    followers += Math.round(80 * noise * weekendBoost);

    out.push({
      date: d.toISOString().slice(0, 10),
      views,
      likes,
      shares,
      followers,
    });
  }
  return out;
}

export interface PlatformBreakdown {
  platform: string;
  views: number;
  likes: number;
  shares: number;
  engagement: number; // 0..1
  posts: number;
}

export type MetricTrend = "up" | "down" | "flat";

export interface GrowthMatrixMetricDelta {
  pct: number;
  trend: MetricTrend;
  /** Pre-formatted delta, e.g. "+12.4%". Empty for all-time. */
  label: string;
}

export interface GrowthMatrixRow extends GrowthRow {
  deltas: Record<"views" | "likes" | "shares", GrowthMatrixMetricDelta>;
}

function platformMetricDelta(
  platform: Platform,
  metric: "views" | "likes" | "shares",
  basePct: number,
  all: boolean,
): GrowthMatrixMetricDelta {
  if (all) return { pct: 0, trend: "flat", label: "" };
  const seed = platform.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + metric.charCodeAt(0);
  const variance = ((seed % 21) - 10) * 1.2;
  const pct = Math.round((basePct + variance) * 10) / 10;
  const trend: MetricTrend = Math.abs(pct) < 0.05 ? "flat" : pct > 0 ? "up" : "down";
  const sign = pct > 0 ? "+" : "";
  return { pct, trend, label: `${sign}${pct.toFixed(1)}%` };
}

/** Growth matrix rows scaled to the selected timeframe with period-over-period deltas. */
export function getGrowthMatrixForTimeframe(
  tf: Timeframe,
  workspace: WorkspaceProfile,
): GrowthMatrixRow[] {
  const { all, factor } = metricHelpers(tf);
  const baseDelta = workspace.metrics.delta;

  return workspace.growthMatrix.map((row) => ({
    platform: row.platform,
    views: Math.round(row.views * factor),
    likes: Math.round(row.likes * factor),
    shares: Math.round(row.shares * factor),
    deltas: {
      views: platformMetricDelta(row.platform, "views", baseDelta.views, all),
      likes: platformMetricDelta(row.platform, "likes", baseDelta.likes, all),
      shares: platformMetricDelta(row.platform, "shares", baseDelta.shares, all),
    },
  }));
}

/** Aggregated per-platform performance for the timeframe (workspace-scoped). */
export function getPlatformBreakdown(
  tf: Timeframe,
  workspace: WorkspaceProfile,
): PlatformBreakdown[] {
  const factor = timeframeDays(tf) / 30;
  return workspace.growthMatrix.map((row) => {
    const engagement = row.views > 0 ? (row.likes + row.shares) / row.views : 0;
    const posts = Math.max(
      1,
      workspace.scheduledPosts.filter((p) => p.platforms.includes(row.platform)).length +
        workspace.publishedPosts.filter((p) => p.platforms.includes(row.platform)).length,
    );
    return {
      platform: row.platform,
      views: Math.round(row.views * factor),
      likes: Math.round(row.likes * factor),
      shares: Math.round(row.shares * factor),
      engagement,
      posts: Math.round(posts * factor) || 1,
    };
  });
}

/** 7×24 grid of normalized engagement scores for the heatmap (Sun..Sat × 0..23). */
export function getEngagementHeatmap(): number[][] {
  // Static mock — peaks Tue/Wed 8-10am, Sat/Sun 7-9pm
  const grid: number[][] = [];
  for (let day = 0; day < 7; day++) {
    const row: number[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const morning = Math.max(0, 1 - Math.abs(hour - 9) / 4) * (day >= 1 && day <= 4 ? 1 : 0.4);
      const evening = Math.max(0, 1 - Math.abs(hour - 20) / 3) * (day === 0 || day === 6 ? 1 : 0.6);
      const noon = Math.max(0, 1 - Math.abs(hour - 12) / 2) * 0.5;
      const v = Math.min(1, morning * 0.6 + evening * 0.7 + noon * 0.4 + 0.05);
      row.push(v);
    }
    grid.push(row);
  }
  return grid;
}
