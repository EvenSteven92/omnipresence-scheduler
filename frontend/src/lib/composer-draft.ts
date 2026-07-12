import type { Platform, ScheduledPost } from "@/lib/mock-data";
import type { PostFormat } from "@/lib/platforms";
import { today } from "@/lib/demo-clock";
import {
  defaultBulkRange,
  smartDistributeBulk,
  suggestTimesForDay,
  type BulkScheduleSlot,
} from "@/lib/schedule-engine";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import {
  aspectLabel,
  bucketFromPostFormat,
  classifyAspect,
  postFormatFromBucket,
  sanitizePlatformsForAspect,
  type AspectBucket,
  type AspectLabel,
} from "@/lib/media-aspect";

export interface DraftPost {
  id: string;
  filename: string;
  /** Editable card title — defaults from filename. */
  title?: string;
  sizeMB?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  mediaKind: "image" | "video";
  format: PostFormat;
  /** Format auto-detected from media — used to badge AUTO·{format} */
  autoFormat: PostFormat;
  /** Detected aspect bucket for platform gating on Schedule. */
  aspectBucket?: AspectBucket;
  aspectLabel?: AspectLabel;
  /** Destinations — chosen on Schedule page (not Compose). */
  platforms: Platform[];
  caption: string;
  /** Per-platform caption overrides — falls back to `caption` when unset. */
  platformCaptions?: Partial<Record<Platform, string>>;
  hashtags: string;
  transcript: string;
  /** Per-platform proposed times (ISO). Populated on Schedule page. */
  proposedTimes?: Partial<Record<Platform, string>>;
  /** Unix ms when the user saved this card to the draft dropzone. */
  savedAt?: number;
  /** Associated event — groups this file with related ministry media. */
  eventId?: string;
  /** Object URL for the uploaded file — set in scheduler addFiles. */
  previewUrl?: string;
  /** Dropbox share link (public). */
  dropboxUrl?: string;
  /** Normalized dl=1 / direct URL for workers + preview. */
  dropboxDirectUrl?: string;
  /** Preferred call-to-action line (Studio whiteboard). */
  callToAction?: string;
  /** Library card this draft was duplicated from. */
  sourceCardId?: string;
  platformTitles?: Partial<Record<Platform, string>>;
  platformHashtags?: Partial<Record<Platform, string>>;
  /** Studio canvas position (px in board space). */
  canvasX?: number;
  canvasY?: number;
  /** Which Studio sections are expanded. */
  studioOpen?: {
    transcript?: boolean;
    cta?: boolean;
    title?: boolean;
    caption?: boolean;
    schedule?: boolean;
    performance?: boolean;
  };
  /** ISO when draft first appeared on a board (library metadata). */
  createdAt?: string;
  /** ISO when draft was last edited on the board. */
  updatedAt?: string;
}

export type DraftFileInput = File | { name: string; sizeBytes: number };

export function composerUid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function detectFormat(filename: string): PostFormat {
  const lower = filename.toLowerCase();
  if (lower.includes("story") || lower.includes("ig_story") || lower.includes("fb_story")) {
    return "story";
  }
  if (
    lower.includes("reel") ||
    lower.includes("short") ||
    lower.includes("tiktok") ||
    lower.includes("portrait")
  ) {
    return "portrait";
  }
  return "landscape";
}

export function detectMediaKind(filename: string): "image" | "video" {
  const lower = filename.toLowerCase();
  return /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(lower) ? "video" : "image";
}

export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function defaultDimensions(
  format: PostFormat,
  mediaKind: "image" | "video",
): { width: number; height: number } {
  if (format === "story" || format === "portrait") return { width: 1080, height: 1920 };
  if (mediaKind === "image") return { width: 1080, height: 1080 };
  return { width: 1920, height: 1080 };
}

export function defaultDurationSec(format: PostFormat): number {
  if (format === "story") return 15;
  if (format === "portrait") return 58;
  return 180;
}

export function formatMediaMeta(draft: DraftPost): string {
  const dims = {
    width: draft.width ?? defaultDimensions(draft.format, draft.mediaKind).width,
    height: draft.height ?? defaultDimensions(draft.format, draft.mediaKind).height,
  };
  const parts = [`${dims.width}×${dims.height}`];
  if (draft.mediaKind === "video") {
    const sec = draft.durationSec ?? defaultDurationSec(draft.format);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    parts.push(`${m}:${String(s).padStart(2, "0")}`);
  }
  if (draft.sizeMB != null) parts.push(`${draft.sizeMB.toFixed(1)} MB`);
  return parts.join(" · ");
}

export function countHashtagsInText(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter((t) => t.startsWith("#")).length : 0;
}

export function revokePreviewUrl(draft: DraftPost) {
  if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
}

export function defaultDraftFromFile(file: DraftFileInput, allowed: Platform[]): DraftPost {
  const name = file.name;
  const sizeBytes = "size" in file ? file.size : file.sizeBytes;
  const fmt = detectFormat(name);
  const mediaKind = detectMediaKind(name);
  const dims = defaultDimensions(fmt, mediaKind);
  const bucket = bucketFromPostFormat(fmt);
  // Platforms chosen on Schedule — leave empty at compose
  void allowed;
  const now = new Date().toISOString();
  return {
    id: composerUid(),
    filename: name,
    title: titleFromFilename(name),
    sizeMB: sizeBytes / (1024 * 1024),
    width: dims.width,
    height: dims.height,
    durationSec: mediaKind === "video" ? defaultDurationSec(fmt) : undefined,
    mediaKind,
    format: fmt,
    autoFormat: fmt,
    aspectBucket: bucket,
    aspectLabel: aspectLabel(bucket),
    platforms: [],
    caption: "",
    hashtags: "",
    transcript: "",
    previewUrl: file instanceof File ? URL.createObjectURL(file) : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/** Apply measured pixel size and refresh aspect + format. */
export function applyMeasuredDimensions(
  draft: DraftPost,
  width: number,
  height: number,
): DraftPost {
  const bucket = classifyAspect(width, height);
  const format = postFormatFromBucket(bucket);
  return {
    ...draft,
    width,
    height,
    aspectBucket: bucket,
    aspectLabel: aspectLabel(bucket),
    format,
    autoFormat: format,
    platforms: sanitizePlatformsForAspect(draft.platforms, bucket),
  };
}

export function replaceDraftMedia(
  draft: DraftPost,
  file: File,
  allowed: Platform[],
): DraftPost {
  revokePreviewUrl(draft);
  const fresh = defaultDraftFromFile(file, allowed);
  return {
    ...draft,
    filename: fresh.filename,
    sizeMB: fresh.sizeMB,
    width: fresh.width,
    height: fresh.height,
    durationSec: fresh.durationSec,
    mediaKind: fresh.mediaKind,
    format: fresh.format,
    autoFormat: fresh.autoFormat,
    previewUrl: fresh.previewUrl,
  };
}

export function draftDisplayTitle(draft: DraftPost): string {
  return draft.title?.trim() || draft.caption.trim() || titleFromFilename(draft.filename);
}

export function draftToPreviewPost(draft: DraftPost): ScheduledPost {
  const times = Object.values(draft.proposedTimes ?? {}).filter(Boolean) as string[];
  const earliest = times.sort()[0];
  return {
    id: draft.id,
    title: draftDisplayTitle(draft),
    platforms: draft.platforms,
    platformTimes: draft.proposedTimes,
    date: earliest ?? new Date().toISOString(),
    status: "draft",
    eventId: draft.eventId,
    caption: draft.caption || undefined,
    hashtags: draft.hashtags || undefined,
    dropboxUrl: draft.dropboxUrl,
    dropboxDirectUrl: draft.dropboxDirectUrl,
    previewUrl: draft.previewUrl ?? draft.dropboxDirectUrl,
  };
}

/** Create a draft card from a Dropbox share link (no local file required). */
export function defaultDraftFromDropbox(
  result: {
    shareUrl: string;
    directUrl: string;
    filename?: string;
    mediaKind: "image" | "video" | "unknown";
  },
  allowed: Platform[],
): DraftPost {
  const filename = result.filename ?? "dropbox-media";
  const mediaKind = result.mediaKind === "image" ? "image" : "video";
  const base = defaultDraftFromFile({ name: filename, sizeBytes: 0 }, allowed);
  return {
    ...base,
    mediaKind,
    dropboxUrl: result.shareUrl,
    dropboxDirectUrl: result.directUrl,
    previewUrl: result.directUrl,
    platforms: [],
  };
}

export function suggestTimesForDraft(
  draft: DraftPost,
  scheduledPosts: ScheduledPost[],
  assigned: BulkScheduleSlot[] = [],
  postingTimes?: WorkspaceProfile["postingTimes"],
): Partial<Record<Platform, string>> {
  return suggestTimesForDay(
    draft,
    today(),
    scheduledPosts,
    assigned,
    postingTimes,
  );
}

export function distributeBulkDraftTimes(
  drafts: DraftPost[],
  scheduledPosts: ScheduledPost[],
  postingTimes?: WorkspaceProfile["postingTimes"],
): Record<string, Partial<Record<Platform, string>>> {
  const range = defaultBulkRange();
  const result = smartDistributeBulk(
    drafts,
    range.start,
    range.end,
    scheduledPosts,
    undefined,
    postingTimes,
  );
  return result.byFile;
}

export function applyProposedTimes(
  draft: DraftPost,
  times: Partial<Record<Platform, string>>,
): DraftPost {
  return { ...draft, proposedTimes: { ...(draft.proposedTimes ?? {}), ...times } };
}