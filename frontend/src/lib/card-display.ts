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
  if (status === "SCHEDULED") return "border border-foreground bg-foreground text-background";
  if (status === "LIVE") return "bg-success text-white";
  return "border border-line bg-secondary text-muted-foreground";
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
  post: Pick<ScheduledPost, "id" | "eventId" | "title">,
  events: ContentEvent[],
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined,
): string {
  const eventId = resolveEventId ? resolveEventId(post) : post.eventId;
  if (eventId) {
    const event = getEventById(events, eventId);
    if (event) return event.title;
  }
  return "Unassigned";
}

/** Neobrutalist stream-card placeholder gradients (Claude Design Cards). */
const STREAM_GRADIENTS = [
  "linear-gradient(135deg, #6d28d9 0%, #db2777 100%)",
  "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
  "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
  "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
  "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
  "linear-gradient(135deg, #6d28d9 0%, #ec4899 100%)",
] as const;

export function streamCardGradient(post: Pick<ScheduledPost, "id" | "title">): string {
  let hash = 0;
  const key = post.id || post.title;
  for (let i = 0; i < key.length; i++)
    hash = (hash + key.charCodeAt(i) * (i + 1)) % STREAM_GRADIENTS.length;
  return STREAM_GRADIENTS[hash]!;
}
