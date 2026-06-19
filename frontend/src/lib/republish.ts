import type { DraftPost } from "@/components/post/ComposerCard";
import type { PostFormat } from "@/lib/platforms";
import type { Platform } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";
import type { PostDetailSource } from "@/lib/post-detail";
import { isPublishedPost } from "@/lib/post-detail";

const STORAGE_PREFIX = "torcc.republishDraft.";

/** In-memory handoff survives React StrictMode remounts (sessionStorage alone does not). */
const pendingByWorkspace = new Map<WorkspaceId, DraftPost>();

function storageKey(workspaceId: WorkspaceId): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

function inferMediaKind(title: string): "image" | "video" {
  const t = title.toLowerCase();
  if (t.includes("quote") || t.includes("carousel") || t.includes("photo")) return "image";
  return "video";
}

function inferFormat(title: string, mediaKind: "image" | "video"): PostFormat {
  const t = title.toLowerCase();
  if (t.includes("story")) return "story";
  if (t.includes("short") || t.includes("reel") || t.includes("portrait") || t.includes("clip")) {
    return "portrait";
  }
  // Composer only supports landscape | portrait | story (no square bucket).
  return "landscape";
}

export function normalizeRepublishDraft(draft: DraftPost): DraftPost {
  const format = draft.format as string;
  const normalized: PostFormat =
    format === "landscape" || format === "portrait" || format === "story"
      ? format
      : inferFormat(draft.caption || draft.filename, draft.mediaKind);
  if (normalized === draft.format && draft.autoFormat === draft.format) return draft;
  return { ...draft, format: normalized, autoFormat: normalized };
}

function filenameFromTitle(title: string, mediaKind: "image" | "video"): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return `${slug || "content_card"}${mediaKind === "video" ? ".mp4" : ".png"}`;
}

function uid(): string {
  return `republish-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Build a composer draft from an existing content card — fresh times, same media intent. */
export function draftFromPostDetail(
  post: PostDetailSource,
  options: {
    allowedPlatforms: Platform[];
    eventId?: string;
  },
): DraftPost {
  const mediaKind = inferMediaKind(post.title);
  const format = inferFormat(post.title, mediaKind);
  const platforms = post.platforms.filter((p) => options.allowedPlatforms.includes(p));
  const resolvedPlatforms = platforms.length > 0 ? platforms : options.allowedPlatforms.slice(0, 1);

  const draft: DraftPost = {
    id: uid(),
    filename: filenameFromTitle(post.title, mediaKind),
    mediaKind,
    format,
    autoFormat: format,
    platforms: resolvedPlatforms,
    caption: post.title,
    hashtags: "",
    transcript: "",
    eventId: options.eventId ?? post.eventId,
  };
  return normalizeRepublishDraft(draft);
}

export function stashRepublishDraft(workspaceId: WorkspaceId, draft: DraftPost): void {
  pendingByWorkspace.set(workspaceId, draft);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(workspaceId), JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

/** Read a pending republish draft without clearing it (safe across StrictMode double-mount). */
export function peekRepublishDraft(workspaceId: WorkspaceId): DraftPost | null {
  const pending = pendingByWorkspace.get(workspaceId);
  if (pending) return normalizeRepublishDraft(pending);
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(workspaceId));
    if (!raw) return null;
    return normalizeRepublishDraft(JSON.parse(raw) as DraftPost);
  } catch {
    return null;
  }
}

export function dismissRepublishDraft(workspaceId: WorkspaceId): void {
  pendingByWorkspace.delete(workspaceId);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(workspaceId));
  } catch {
    /* ignore */
  }
}

export function republishSourceLabel(post: PostDetailSource): "published" | "scheduled" {
  return isPublishedPost(post) ? "published" : "scheduled";
}
