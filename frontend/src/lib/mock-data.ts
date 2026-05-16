export type Platform = "X" | "FB" | "IG" | "YT" | "TIKTOK" | "IG STORY" | "FB STORY";

export interface ScheduledPost {
  id: string;
  title: string;
  platforms: Platform[];
  date: string; // ISO
  status: "scheduled" | "draft" | "published";
}

export const scheduledPosts: ScheduledPost[] = [
  { id: "1", title: "Sunday Service Highlights — Week 18", platforms: ["IG", "TIKTOK", "IG STORY"], date: "2026-05-14T11:00:00", status: "scheduled" },
  { id: "2", title: "Worship Night Recap", platforms: ["FB STORY", "YT"], date: "2026-05-15T15:00:00", status: "scheduled" },
  { id: "3", title: "Product launch teaser — countdown variant A", platforms: ["X", "FB", "IG", "YT"], date: "2026-05-20T09:00:00", status: "scheduled" },
  { id: "4", title: "Community Q&A — saved replies pack", platforms: ["X", "FB", "IG"], date: "2026-05-28T18:30:00", status: "scheduled" },
];

export const metrics = [
  { label: "Total Views", value: "12,480", delta: "+6.8%", trend: "up" as const },
  { label: "Total Likes", value: "842", delta: "+2.1%", trend: "up" as const },
  { label: "Total Shares", value: "298", delta: "-4.3%", trend: "down" as const },
  { label: "Engagement Rate", value: "3.8%", delta: "+0.3pp", trend: "up" as const },
  { label: "Link Clicks", value: "1,904", delta: "+12.2%", trend: "up" as const },
  { label: "Profile Visits", value: "3,402", delta: "-2.1%", trend: "down" as const },
  { label: "Total Followers", value: "428,950", delta: "+1.1%", trend: "up" as const, note: "Sum across every connected account (YT, Meta, X, TikTok, etc.)" },
];

export const growthMatrix = [
  { platform: "YT", views: 8200, likes: 540, shares: 120 },
  { platform: "FB", views: 6400, likes: 410, shares: 88 },
  { platform: "IG", views: 11200, likes: 980, shares: 240 },
  { platform: "X", views: 3800, likes: 220, shares: 64 },
  { platform: "TIKTOK", views: 28400, likes: 2240, shares: 612 },
  { platform: "IG STORY", views: 7100, likes: 0, shares: 0 },
  { platform: "FB STORY", views: 5300, likes: 0, shares: 0 },
];

// ─── Published posts (for "top performers" dashboard widget) ───────────────────

export interface PublishedPost {
  id: string;
  title: string;
  platforms: Platform[];
  date: string;
  views: number;
  likes: number;
  shares: number;
  engagementRate: number; // 0..1
}

export const publishedPosts: PublishedPost[] = [
  {
    id: "p1",
    title: "Devotional rhythms — 3 practices to anchor your week",
    platforms: ["IG", "TIKTOK", "YT"],
    date: "2026-05-08T11:00:00",
    views: 48_320, likes: 4_812, shares: 612, engagementRate: 0.112,
  },
  {
    id: "p2",
    title: "Behind the worship band — soundcheck vlog",
    platforms: ["YT", "IG", "FB"],
    date: "2026-05-06T19:00:00",
    views: 22_440, likes: 1_204, shares: 188, engagementRate: 0.062,
  },
  {
    id: "p3",
    title: "Sunday Q&A — your top 5 questions answered",
    platforms: ["X", "IG", "FB"],
    date: "2026-05-03T18:00:00",
    views: 17_980, likes: 988, shares: 144, engagementRate: 0.063,
  },
  {
    id: "p4",
    title: "Spring conference replay — opening night",
    platforms: ["YT", "FB"],
    date: "2026-04-28T20:00:00",
    views: 14_210, likes: 612, shares: 92, engagementRate: 0.050,
  },
];

// ─── Platform connections (for "health strip" dashboard widget) ────────────────

export type ConnectionStatus = "ok" | "expiring" | "disconnected";

export const platformConnections: { platform: Platform; status: ConnectionStatus; expiresInDays?: number }[] = [
  { platform: "YT", status: "ok" },
  { platform: "FB", status: "ok" },
  { platform: "IG", status: "expiring", expiresInDays: 4 },
  { platform: "X", status: "ok" },
  { platform: "TIKTOK", status: "disconnected" },
  { platform: "IG STORY", status: "ok" },
  { platform: "FB STORY", status: "ok" },
];
