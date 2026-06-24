import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { getEventById } from "@/lib/events/display";
import { inferMediaKind } from "@/lib/scheduled-post-display";
import { buildPlatformSlots, formatScheduleTimeShort } from "@/lib/schedule-display";
import type { Platform } from "@/lib/mock-data";

export type CardMediaType = "VIDEO" | "IMAGE" | "CAROUSEL" | "STORY";

export type CardLifecycleStatus = "SCHEDULED" | "LIVE" | "DRAFT";

const PLATFORM_DOT: Partial<Record<Platform, string>> = {
  YT: "#D43A2F",
  "YT SHORTS": "#D43A2F",
  FB: "#3B5BA5",
  IG: "#C13584",
  TIKTOK: "#1A1A1A",
  X: "#1A1A1A",
  RUMBLE: "#5B8A2B",
  "IG STORY": "#C13584",
  "FB STORY": "#3B5BA5",
};

export function inferCardMediaType(title: string, mediaKind?: "image" | "video"): CardMediaType {
  const t = title.toLowerCase();
  if (t.includes("story")) return "STORY";
  if (t.includes("carousel")) return "CAROUSEL";
  const kind = mediaKind ?? inferMediaKind(title);
  return kind === "image" ? "IMAGE" : "VIDEO";
}

export function cardStatusFromPost(post: ScheduledPost): CardLifecycleStatus {
  if (post.status === "published") return "LIVE";
  if (post.status === "draft") return "DRAFT";
  return "SCHEDULED";
}

export function cardStatusClass(status: CardLifecycleStatus): string {
  if (status === "SCHEDULED") return "bg-accent text-foreground";
  if (status === "LIVE") return "bg-[#3F9D5A] text-white";
  return "border-[1.5px] border-foreground bg-transparent text-foreground";
}

export function platformDotColor(platform: Platform): string {
  return PLATFORM_DOT[platform] ?? "#1A1A1A";
}

export function shortPublishTime(isoOrLabel: string): string {
  return isoOrLabel.replace(":00", "").replace(/ AM/g, "A").replace(/ PM/g, "P");
}

export function publishChipLabel(platform: Platform, at?: string): string {
  const short = platform
    .replace("YT SHORTS", "YT")
    .replace("IG STORY", "IG")
    .replace("FB STORY", "FB")
    .replace("TIKTOK", "TT")
    .replace("RUMBLE", "RUM");
  if (!at) return short;
  return `${short} ${shortPublishTime(at)}`;
}

export function publishEntriesForPost(post: ScheduledPost) {
  const slots = buildPlatformSlots(post.platforms, post.platformTimes, post.date);
  return slots.map((slot) => ({
    platform: slot.platform,
    label: publishChipLabel(slot.platform, formatScheduleTimeShort(slot.iso)),
    dotColor: platformDotColor(slot.platform),
  }));
}

export function resolveAlbumLabel(
  post: Pick<ScheduledPost, "eventId" | "title">,
  events: ContentEvent[],
): string {
  if (post.eventId) {
    const event = getEventById(events, post.eventId);
    if (event) return event.title;
  }
  return "Unassigned";
}