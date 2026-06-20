import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import type { PlatformEntry } from "@/components/post/PlatformRow";
import type { PlatformEntry } from "@/components/post/PlatformRow";

export type PostStatus = "scheduled" | "draft" | "published" | "failed";

export interface DisplayPost {
  id: string;
  title: string;
  status: PostStatus;
  when?: string;
  mediaKind?: "image" | "video" | "none";
  aspectRatio?: string;
  previewUrl?: string;
  platforms: PlatformEntry[];
}
import { demoPreviewForPost } from "@/lib/demo-media";
import { dayEndExclusive } from "@/lib/demo-clock";
import {
  buildPlatformSlots,
  formatScheduleAt,
  formatScheduleTimeShort,
} from "@/lib/schedule-display";

const UPCOMING_WINDOW_DAYS = 7;

/** Earliest publish instant across all platforms on this content card. */
export function contentCardAnchorIso(post: ScheduledPost): string {
  const slots = buildPlatformSlots(post.platforms, post.platformTimes, post.date);
  return slots[0]?.iso ?? post.date;
}

export function contentCardAnchorDate(post: ScheduledPost): Date {
  return new Date(contentCardAnchorIso(post));
}

/** Display entries for PostCard / calendar — one row per platform with its time. */
export function scheduledPostPlatformEntries(post: ScheduledPost): PlatformEntry[] {
  const slots = buildPlatformSlots(post.platforms, post.platformTimes, post.date);
  return slots.map((s) => ({
    platform: s.platform,
    state: post.status === "published" ? "published" : "scheduled",
    at: formatScheduleTimeShort(s.iso),
  }));
}

/** Human-readable time spread when platforms publish at different times. */
export function contentCardPublishSpread(post: ScheduledPost): string {
  const slots = buildPlatformSlots(post.platforms, post.platformTimes, post.date);
  if (slots.length === 0) return formatScheduleAt(post.date);
  if (slots.length === 1) return formatScheduleTimeShort(slots[0]!.iso);
  const first = slots[0]!;
  const last = slots[slots.length - 1]!;
  if (first.iso === last.iso) return formatScheduleTimeShort(first.iso);
  return `${formatScheduleTimeShort(first.iso)} → ${formatScheduleTimeShort(last.iso)}`;
}

export function inferMediaKind(title: string): "image" | "video" {
  const t = title.toLowerCase();
  if (t.includes("quote") || t.includes("carousel") || t.includes("photo")) return "image";
  return "video";
}

/** CSS aspect-ratio value — width scales from a fixed card height (9:16 reels stay narrow). */
export function inferMediaAspect(title: string, mediaKind?: "image" | "video"): string {
  const kind = mediaKind ?? inferMediaKind(title);
  const t = title.toLowerCase();
  if (t.includes("story")) return "9/16";
  if (
    t.includes("reel") ||
    t.includes("short") ||
    t.includes("tiktok") ||
    t.includes("portrait") ||
    t.includes("clip")
  ) {
    return "9/16";
  }
  if (t.includes("quote") || t.includes("carousel")) return "1/1";
  if (t.includes("photo")) return "4/3";
  return kind === "video" ? "16/9" : "4/3";
}

/** Map published analytics rows onto ContentCardChip's scheduled-post shape. */
export function publishedPostToCardPost(post: PublishedPost): ScheduledPost {
  return {
    id: post.id,
    title: post.title,
    platforms: post.platforms,
    date: post.date,
    platformTimes: post.platformTimes,
    status: "published",
    eventId: post.eventId,
  };
}

export function scheduledPostToDisplayPost(post: ScheduledPost): DisplayPost {
  const anchor = contentCardAnchorDate(post);
  const mediaKind = inferMediaKind(post.title);
  return {
    id: post.id,
    title: post.title,
    status: post.status,
    when: anchor.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    mediaKind,
    aspectRatio: inferMediaAspect(post.title, mediaKind),
    previewUrl: demoPreviewForPost({ id: post.id, title: post.title, mediaKind }),
    platforms: scheduledPostPlatformEntries(post),
  };
}

/** Group scheduled posts by calendar day using each card's anchor (earliest) publish date. */
export function groupContentCardsByDay(
  posts: ScheduledPost[],
  year: number,
  month: number,
): Map<number, ScheduledPost[]> {
  const map = new Map<number, ScheduledPost[]>();
  posts.forEach((p) => {
    const dt = contentCardAnchorDate(p);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate();
      const arr = map.get(day) ?? [];
      arr.push(p);
      map.set(day, arr);
    }
  });
  map.forEach((arr) => arr.sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b)));
  return map;
}

/** Same window as dashboard "upcoming · next_7d" and calendar agenda focus month days. */
export function isContentCardInUpcomingWindow(
  post: ScheduledPost,
  fromDayStart: Date,
  days = UPCOMING_WINDOW_DAYS,
): boolean {
  if (post.status === "published") return false;
  const anchor = contentCardAnchorDate(post);
  const start = new Date(
    fromDayStart.getFullYear(),
    fromDayStart.getMonth(),
    fromDayStart.getDate(),
  );
  const end = dayEndExclusive(start, days);
  return anchor.getTime() >= start.getTime() && anchor.getTime() < end.getTime();
}

export function getUpcomingContentCards(
  posts: ScheduledPost[],
  fromDayStart: Date,
  days = UPCOMING_WINDOW_DAYS,
): ScheduledPost[] {
  return [...posts]
    .filter((p) => isContentCardInUpcomingWindow(p, fromDayStart, days))
    .sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b));
}

export function getQuietDaysInUpcomingWindow(
  posts: ScheduledPost[],
  fromDayStart: Date,
  days = UPCOMING_WINDOW_DAYS,
): string[] {
  const upcoming = getUpcomingContentCards(posts, fromDayStart, days);
  const dates = new Set(upcoming.map((p) => contentCardAnchorDate(p).toDateString()));
  const gaps: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(fromDayStart);
    d.setDate(fromDayStart.getDate() + i);
    if (!dates.has(d.toDateString())) {
      gaps.push(d.toLocaleDateString(undefined, { weekday: "short" }));
    }
  }
  return gaps;
}

export type UpcomingDaySlot = {
  date: Date;
  isToday: boolean;
  posts: ScheduledPost[];
};

/** Fixed 7-day window starting at today — includes empty days, today always first. */
export function getUpcomingDaySlots(
  posts: ScheduledPost[],
  fromDayStart: Date,
  days = UPCOMING_WINDOW_DAYS,
): UpcomingDaySlot[] {
  const upcoming = getUpcomingContentCards(posts, fromDayStart, days);
  const byDay = new Map<string, ScheduledPost[]>();
  upcoming.forEach((p) => {
    const key = contentCardAnchorDate(p).toDateString();
    const arr = byDay.get(key) ?? [];
    arr.push(p);
    byDay.set(key, arr);
  });
  byDay.forEach((arr) => arr.sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b)));

  const slots: UpcomingDaySlot[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(fromDayStart);
    date.setDate(fromDayStart.getDate() + i);
    slots.push({
      date,
      isToday: i === 0,
      posts: byDay.get(date.toDateString()) ?? [],
    });
  }
  return slots;
}

export { UPCOMING_WINDOW_DAYS };
