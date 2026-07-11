/** Shared post/platform types — workspace-scoped data lives in `@/lib/workspaces`. */

export type Platform =
  | "X"
  | "FB"
  | "IG"
  | "YT"
  | "RUMBLE"
  | "YT SHORTS"
  | "TIKTOK"
  | "IG STORY"
  | "FB STORY";

/** Optional file metadata surfaced on the card detail page. */
export interface CardFileMeta {
  caption?: string;
  hashtags?: string;
  dimensions?: string;
  durationSec?: number;
  sizeMB?: number;
  createdAt?: string;
  /** Dropbox share link as pasted by the editor. */
  dropboxUrl?: string;
  /** Direct/download-style URL for preview or future publish worker. */
  dropboxDirectUrl?: string;
  /** Local blob or Dropbox direct preview. */
  previewUrl?: string;
}

export interface ScheduledPost extends CardFileMeta {
  id: string;
  title: string;
  platforms: Platform[];
  /** Primary / earliest publish time (ISO). */
  date: string;
  /** Per-platform times — one content card, multiple publishes. */
  platformTimes?: Partial<Record<Platform, string>>;
  /** Publish lifecycle — traffic light maps draft→idle, scheduled→yellow, published→green, failed→red. */
  status: "scheduled" | "draft" | "published" | "failed";
  /** Associated ministry event — not a tag/label. */
  eventId?: string;
}

export interface PublishedPost extends CardFileMeta {
  id: string;
  title: string;
  platforms: Platform[];
  date: string;
  /** Per-platform publish times when they differ from the primary date. */
  platformTimes?: Partial<Record<Platform, string>>;
  /** Associated ministry event — not a tag/label. */
  eventId?: string;
  views: number;
  likes: number;
  shares: number;
  engagementRate: number; // 0..1
}

export type ConnectionStatus = "ok" | "expiring" | "disconnected";
