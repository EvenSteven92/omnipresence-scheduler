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
  { id: "1w", label: "1 wk",    days: 7 },
  { id: "1m", label: "1 mnth",  days: 30 },
  { id: "3m", label: "3 mnths", days: 90 },
  { id: "6m", label: "6 mnths", days: 180 },
  { id: "1y", label: "1 yr",    days: 365 },
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

// ─── Metric scaling (mock) ──────────────────────────────────────────────────

const BASE_METRICS_30D = {
  views: 12_480,
  likes: 842,
  shares: 298,
  engagement: 0.038,
  linkClicks: 1_904,
  profileVisits: 3_402,
  followers: 428_950, // cumulative — does NOT scale
};

const BASE_DELTA = {
  views: 6.8,
  likes: 2.1,
  shares: -4.3,
  engagement: 0.3,
  linkClicks: 12.2,
  profileVisits: -2.1,
  followers: 1.1,
};

export interface MetricRow {
  key: keyof typeof BASE_METRICS_30D;
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

/**
 * Returns the 7 dashboard metrics scaled for the given timeframe.
 * Mock-only: scales linearly by days/30 for flow metrics; followers cumulative; rates unchanged.
 */
export function getMetrics(tf: Timeframe): MetricRow[] {
  const all = isAllTime(tf);
  const days = timeframeDays(tf);
  const factor = days / 30;

  function delta(pct: number, unit: "%" | "pp"): string {
    if (all) return "";
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(unit === "pp" ? 1 : 1)}${unit}`;
  }
  function trend(pct: number): "up" | "down" | "flat" {
    if (all) return "flat";
    if (Math.abs(pct) < 0.05) return "flat";
    return pct > 0 ? "up" : "down";
  }

  return [
    {
      key: "views",
      label: "Total Views",
      value: nf(BASE_METRICS_30D.views * factor),
      delta: delta(BASE_DELTA.views, "%"),
      trend: trend(BASE_DELTA.views),
    },
    {
      key: "likes",
      label: "Total Likes",
      value: nf(BASE_METRICS_30D.likes * factor),
      delta: delta(BASE_DELTA.likes, "%"),
      trend: trend(BASE_DELTA.likes),
    },
    {
      key: "shares",
      label: "Total Shares",
      value: nf(BASE_METRICS_30D.shares * factor),
      delta: delta(BASE_DELTA.shares, "%"),
      trend: trend(BASE_DELTA.shares),
    },
    {
      key: "engagement",
      label: "Engagement Rate",
      value: `${(BASE_METRICS_30D.engagement * 100).toFixed(1)}%`,
      delta: delta(BASE_DELTA.engagement, "pp"),
      trend: trend(BASE_DELTA.engagement),
    },
    {
      key: "linkClicks",
      label: "Link Clicks",
      value: nf(BASE_METRICS_30D.linkClicks * factor),
      delta: delta(BASE_DELTA.linkClicks, "%"),
      trend: trend(BASE_DELTA.linkClicks),
    },
    {
      key: "profileVisits",
      label: "Profile Visits",
      value: nf(BASE_METRICS_30D.profileVisits * factor),
      delta: delta(BASE_DELTA.profileVisits, "%"),
      trend: trend(BASE_DELTA.profileVisits),
    },
    {
      key: "followers",
      label: "Total Followers",
      value: nf(BASE_METRICS_30D.followers),
      delta: delta(BASE_DELTA.followers, "%"),
      trend: trend(BASE_DELTA.followers),
      note: "Sum across every connected account (YT, Meta, X, TikTok, etc.)",
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
export function getDailySeries(tf: Timeframe, anchor = new Date(2026, 4, 13)): SeriesPoint[] {
  const days = Math.min(timeframeDays(tf), 365 * 2); // cap series length
  const out: SeriesPoint[] = [];
  const baseViews = 380;
  const baseLikes = 28;
  const baseShares = 9;
  let followers = 428_950 - Math.round(days * 110);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const seed = (d.getFullYear() * 1000 + d.getMonth() * 31 + d.getDate()) % 97;
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

/** Aggregated per-platform performance for the timeframe. */
export function getPlatformBreakdown(tf: Timeframe): PlatformBreakdown[] {
  const factor = timeframeDays(tf) / 30;
  return [
    { platform: "YT",       views: 8_200,  likes: 540,   shares: 120, engagement: 0.087, posts: 4 },
    { platform: "FB",       views: 6_400,  likes: 410,   shares: 88,  engagement: 0.072, posts: 8 },
    { platform: "IG",       views: 11_200, likes: 980,   shares: 240, engagement: 0.108, posts: 12 },
    { platform: "X",        views: 3_800,  likes: 220,   shares: 64,  engagement: 0.061, posts: 22 },
    { platform: "TIKTOK",   views: 28_400, likes: 2_240, shares: 612, engagement: 0.124, posts: 9 },
    { platform: "IG STORY", views: 7_100,  likes: 0,     shares: 0,   engagement: 0.041, posts: 16 },
    { platform: "FB STORY", views: 5_300,  likes: 0,     shares: 0,   engagement: 0.029, posts: 11 },
  ].map((p) => ({
    ...p,
    views: Math.round(p.views * factor),
    likes: Math.round(p.likes * factor),
    shares: Math.round(p.shares * factor),
    posts: Math.round(p.posts * factor),
  }));
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
