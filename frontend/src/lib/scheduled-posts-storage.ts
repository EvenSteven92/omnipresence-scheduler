import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";

const POSTS_PREFIX = "torcc.composerScheduled.";
const DELETED_PREFIX = "torcc.composerScheduled.deleted.";

function postsKey(workspaceId: WorkspaceId): string {
  return `${POSTS_PREFIX}${workspaceId}`;
}

function deletedKey(workspaceId: WorkspaceId): string {
  return `${DELETED_PREFIX}${workspaceId}`;
}

/**
 * Read scheduled post overlays from localStorage (survives app restarts).
 * One-time migrate from legacy sessionStorage.
 */
export function readScheduledPosts(workspaceId: WorkspaceId): ScheduledPost[] {
  if (typeof window === "undefined") return [];
  const key = postsKey(workspaceId);
  try {
    const local = window.localStorage.getItem(key);
    if (local) {
      const parsed = JSON.parse(local) as ScheduledPost[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    /* ignore */
  }
  try {
    const session = window.sessionStorage.getItem(key);
    if (session) {
      window.localStorage.setItem(key, session);
      window.sessionStorage.removeItem(key);
      const parsed = JSON.parse(session) as ScheduledPost[];
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function writeScheduledPosts(workspaceId: WorkspaceId, posts: ScheduledPost[]): void {
  if (typeof window === "undefined") return;
  const key = postsKey(workspaceId);
  try {
    if (posts.length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(posts));
    }
    // Drop legacy session key so it cannot resurrect after quit
    window.sessionStorage.removeItem(key);
  } catch {
    /* quota / private mode */
  }
}

/** Seed post ids the user removed — so demo cards stay gone across restarts. */
export function readDeletedPostIds(workspaceId: WorkspaceId): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(deletedKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeDeletedPostIds(workspaceId: WorkspaceId, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = deletedKey(workspaceId);
    if (ids.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {
    /* ignore */
  }
}

export function markPostDeleted(workspaceId: WorkspaceId, postId: string): void {
  const next = [...readDeletedPostIds(workspaceId), postId];
  writeDeletedPostIds(workspaceId, next);
}

/**
 * Merge workspace seed posts with local overlays.
 * Local wins on id match; deleted seed ids stay removed.
 */
export function mergeScheduledPosts(
  base: ScheduledPost[],
  custom: ScheduledPost[],
  deletedIds: readonly string[] = [],
): ScheduledPost[] {
  const deleted = new Set(deletedIds);
  const byId = new Map<string, ScheduledPost>();
  base.forEach((p) => {
    if (!deleted.has(p.id)) byId.set(p.id, p);
  });
  custom.forEach((p) => {
    if (!deleted.has(p.id)) byId.set(p.id, p);
  });
  return [...byId.values()].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}
