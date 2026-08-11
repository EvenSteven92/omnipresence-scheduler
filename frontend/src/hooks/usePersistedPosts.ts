import { useCallback, useEffect, useState } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";

const STORAGE_PREFIX = "torcc.composerScheduled.";

function storageKey(workspaceId: WorkspaceId): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

function readLocal(workspaceId: WorkspaceId): ScheduledPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    return JSON.parse(raw) as ScheduledPost[];
  } catch {
    return [];
  }
}

function writeLocal(workspaceId: WorkspaceId, posts: ScheduledPost[]) {
  try {
    window.sessionStorage.setItem(storageKey(workspaceId), JSON.stringify(posts));
  } catch {
    /* ignore */
  }
}

/**
 * Scheduled cards for a workspace — browser-only (sessionStorage).
 * No remote DB / API path.
 */
export function usePersistedPosts(workspaceId: WorkspaceId) {
  const [localPosts, setLocalPosts] = useState<ScheduledPost[]>(() => readLocal(workspaceId));

  useEffect(() => {
    setLocalPosts(readLocal(workspaceId));
  }, [workspaceId]);

  const addScheduledPosts = useCallback(
    async (incoming: ScheduledPost[]) => {
      if (incoming.length === 0) return;
      // Upsert by id so re-schedule updates times and board borders refresh.
      setLocalPosts((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        incoming.forEach((p) => {
          byId.set(p.id, p);
        });
        const next = Array.from(byId.values());
        writeLocal(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  const upsertScheduledPost = useCallback(
    async (post: ScheduledPost) => {
      setLocalPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        const next = idx === -1 ? [...prev, post] : prev.map((p, i) => (i === idx ? post : p));
        writeLocal(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  const removeScheduledPost = useCallback(
    async (postId: string) => {
      setLocalPosts((prev) => {
        const next = prev.filter((p) => p.id !== postId);
        writeLocal(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  const associatePost = useCallback(
    async (postId: string, eventId: string | undefined) => {
      setLocalPosts((prev) => {
        const next = prev.map((p) =>
          p.id === postId ? { ...p, eventId: eventId || undefined } : p,
        );
        writeLocal(workspaceId, next);
        return next;
      });
      return true;
    },
    [workspaceId],
  );

  return {
    posts: localPosts,
    /** Always false — local-only build has no Postgres path. */
    dbMode: false as const,
    isLoading: false,
    addScheduledPosts,
    upsertScheduledPost,
    removeScheduledPost,
    associatePost,
    refetch: () => {
      setLocalPosts(readLocal(workspaceId));
    },
  };
}
