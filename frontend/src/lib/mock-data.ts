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
