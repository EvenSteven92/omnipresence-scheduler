import type { ConnectionStatus, Platform, PublishedPost, ScheduledPost } from "@/lib/mock-data";

export type { Platform } from "@/lib/mock-data";

export type WorkspaceId = "torcc" | "open-eyes" | "keka" | "first-love";

export type WorkspaceOnboardingStatus = "complete" | "needs_accounts" | "draft";

export interface WorkspaceMetricsBase {
  views: number;
  likes: number;
  shares: number;
  engagement: number;
  linkClicks: number;
  profileVisits: number;
  followers: number;
  delta: {
    views: number;
    likes: number;
    shares: number;
    engagement: number;
    linkClicks: number;
    profileVisits: number;
    followers: number;
  };
}

export interface GrowthRow {
  platform: Platform;
  views: number;
  likes: number;
  shares: number;
}

export interface PlatformConnectionRow {
  platform: Platform;
  status: ConnectionStatus;
  expiresInDays?: number;
}

export type ContentEventKind =
  | "sunday_sermon"
  | "worship_night"
  | "youth"
  | "campaign"
  | "conference"
  | "other";

/** Ministry event — groups related media (sermon + reel + clips) under one moment. */
export interface ContentEvent {
  id: string;
  title: string;
  /** Anchor date for the event (e.g. sermon Sunday). */
  date: string;
  kind: ContentEventKind;
  description?: string;
  /** Optional sermon/event graphic (blob URL, data URL, or remote). */
  coverUrl?: string;
}

/** Per-company bundle — mirrors what the API will return per workspace later. */
export interface WorkspaceProfile {
  id: WorkspaceId;
  name: string;
  slug: string;
  initials: string;
  tagline: string;
  onboardingStatus: WorkspaceOnboardingStatus;
  /** Brand accent color (oklch/hex) — tints the UI when this workspace is active. */
  accent: string;
  /** Text color to sit on the accent (defaults handled by consumers). */
  accentForeground?: string;
  /** Brand voice / tone guidelines fed into AI caption + hashtag generation. */
  voice: string;
  /** Per-brand optimal posting times; falls back to global platform peakTimes when unset. */
  postingTimes?: Partial<Record<Platform, string[]>>;
  /** Platforms this company actively uses (metrics + scheduling scope). */
  platforms: Platform[];
  metrics: WorkspaceMetricsBase;
  growthMatrix: GrowthRow[];
  scheduledPosts: ScheduledPost[];
  publishedPosts: PublishedPost[];
  platformConnections: PlatformConnectionRow[];
  /** Ministry events for associating related media files. */
  events: ContentEvent[];
}
