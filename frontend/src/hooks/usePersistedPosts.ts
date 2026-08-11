import { useCallback, useEffect, useState } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";
import {
  markPostDeleted,
  readDeletedPostIds,
  readScheduledPosts,
  writeDeletedPostIds,
  writeScheduledPosts,
} from "@/lib/scheduled-posts-storage";

/**
 * Scheduled cards for a workspace — browser-local, survives app restarts
 * via localStorage (with one-time migrate from sessionStorage).
 */
export function usePersistedPosts(workspaceId: WorkspaceId) {
  const [localPosts, setLocalPosts] = useState<ScheduledPost[]>(() =>
    readScheduledPosts(workspaceId),
  );
  const [deletedIds, setDeletedIds] = useState<string[]>(() => readDeletedPostIds(workspaceId));

  useEffect(() => {
    setLocalPosts(readScheduledPosts(workspaceId));
    setDeletedIds(readDeletedPostIds(workspaceId));
  }, [workspaceId]);

  const clearDeleted = useCallback(
    (ids: string[]) => {
      setDeletedIds((prev) => {
        const drop = new Set(ids);
        const next = prev.filter((id) => !drop.has(id));
        if (next.length !== prev.length) writeDeletedPostIds(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  const addScheduledPosts = useCallback(
    async (incoming: ScheduledPost[]) => {
      if (incoming.length === 0) return;
      setLocalPosts((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        incoming.forEach((p) => {
          byId.set(p.id, p);
        });
        const next = Array.from(byId.values());
        writeScheduledPosts(workspaceId, next);
        return next;
      });
      clearDeleted(incoming.map((p) => p.id));
    },
    [workspaceId, clearDeleted],
  );

  const upsertScheduledPost = useCallback(
    async (post: ScheduledPost) => {
      setLocalPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        const next = idx === -1 ? [...prev, post] : prev.map((p, i) => (i === idx ? post : p));
        writeScheduledPosts(workspaceId, next);
        return next;
      });
      clearDeleted([post.id]);
    },
    [workspaceId, clearDeleted],
  );

  const removeScheduledPost = useCallback(
    async (postId: string) => {
      setLocalPosts((prev) => {
        const next = prev.filter((p) => p.id !== postId);
        writeScheduledPosts(workspaceId, next);
        return next;
      });
      markPostDeleted(workspaceId, postId);
      setDeletedIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
    },
    [workspaceId],
  );

  const associatePost = useCallback(
    async (postId: string, eventId: string | undefined) => {
      setLocalPosts((prev) => {
        const next = prev.map((p) =>
          p.id === postId ? { ...p, eventId: eventId || undefined } : p,
        );
        writeScheduledPosts(workspaceId, next);
        return next;
      });
      return true;
    },
    [workspaceId],
  );

  return {
    posts: localPosts,
    deletedIds,
    /** Always false — local-only build has no Postgres path. */
    dbMode: false as const,
    isLoading: false,
    addScheduledPosts,
    upsertScheduledPost,
    removeScheduledPost,
    associatePost,
    refetch: () => {
      setLocalPosts(readScheduledPosts(workspaceId));
      setDeletedIds(readDeletedPostIds(workspaceId));
    },
  };
}
