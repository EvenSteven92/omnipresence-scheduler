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
import { syncScheduleToWorker } from "@/lib/worker-schedule";

/**
 * Scheduled cards — localStorage + mirror to Mac worker for armed Meta auto-post.
 */
export function usePersistedPosts(workspaceId: WorkspaceId) {
  const [localPosts, setLocalPosts] = useState<ScheduledPost[]>(() =>
    readScheduledPosts(workspaceId),
  );
  const [deletedIds, setDeletedIds] = useState<string[]>(() => readDeletedPostIds(workspaceId));

  useEffect(() => {
    const posts = readScheduledPosts(workspaceId);
    setLocalPosts(posts);
    setDeletedIds(readDeletedPostIds(workspaceId));
    if (posts.length > 0) void syncScheduleToWorker(workspaceId, posts);
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

  const persist = useCallback(
    (next: ScheduledPost[]) => {
      writeScheduledPosts(workspaceId, next);
      void syncScheduleToWorker(workspaceId, next);
      return next;
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
        return persist(Array.from(byId.values()));
      });
      clearDeleted(incoming.map((p) => p.id));
    },
    [persist, clearDeleted],
  );

  const upsertScheduledPost = useCallback(
    async (post: ScheduledPost) => {
      setLocalPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        const next = idx === -1 ? [...prev, post] : prev.map((p, i) => (i === idx ? post : p));
        return persist(next);
      });
      clearDeleted([post.id]);
    },
    [persist, clearDeleted],
  );

  const removeScheduledPost = useCallback(
    async (postId: string) => {
      setLocalPosts((prev) => {
        const next = prev.filter((p) => p.id !== postId);
        return persist(next);
      });
      markPostDeleted(workspaceId, postId);
      setDeletedIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
    },
    [workspaceId, persist],
  );

  const associatePost = useCallback(
    async (postId: string, eventId: string | undefined) => {
      setLocalPosts((prev) => {
        const next = prev.map((p) =>
          p.id === postId ? { ...p, eventId: eventId || undefined } : p,
        );
        return persist(next);
      });
      return true;
    },
    [persist],
  );

  return {
    posts: localPosts,
    deletedIds,
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
