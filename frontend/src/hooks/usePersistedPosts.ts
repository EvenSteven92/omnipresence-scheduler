import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";
import {
  deletePostRemote,
  fetchWorkspacePosts,
  patchPostRemote,
  savePosts,
  type SavePostPayload,
} from "@/lib/api/posts";

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
 * Scheduled cards for a workspace.
 * Uses Postgres via /api/posts when DATABASE_URL is set; otherwise sessionStorage.
 */
export function usePersistedPosts(workspaceId: WorkspaceId) {
  const queryClient = useQueryClient();
  const remote = useQuery({
    queryKey: ["workspace-posts", workspaceId],
    queryFn: () => fetchWorkspacePosts(workspaceId),
    staleTime: 15_000,
  });

  const dbMode = remote.data?.source === "db";
  const [localPosts, setLocalPosts] = useState<ScheduledPost[]>(() => readLocal(workspaceId));

  useEffect(() => {
    if (!dbMode) setLocalPosts(readLocal(workspaceId));
  }, [workspaceId, dbMode]);

  const posts = dbMode ? (remote.data?.posts ?? []) : localPosts;

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["workspace-posts", workspaceId] });
  }, [queryClient, workspaceId]);

  const addScheduledPosts = useCallback(
    async (incoming: ScheduledPost[]) => {
      if (incoming.length === 0) return;

      if (dbMode) {
        const payload: SavePostPayload[] = incoming.map((p) => ({
          id: p.id,
          workspaceId,
          title: p.title,
          caption: p.caption,
          hashtags: p.hashtags,
          platforms: p.platforms,
          platformTimes: p.platformTimes,
          date: p.date,
          status: p.status,
          eventId: p.eventId ?? null,
        }));
        const saved = await savePosts(payload);
        if (saved) {
          invalidate();
          return;
        }
        // fall through to local if save failed
      }

      setLocalPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = [...prev];
        incoming.forEach((p) => {
          if (!seen.has(p.id)) next.push(p);
        });
        writeLocal(workspaceId, next);
        return next;
      });
    },
    [dbMode, workspaceId, invalidate],
  );

  const upsertScheduledPost = useCallback(
    async (post: ScheduledPost) => {
      if (dbMode) {
        const saved = await savePosts([
          {
            id: post.id,
            workspaceId,
            title: post.title,
            caption: post.caption,
            hashtags: post.hashtags,
            platforms: post.platforms,
            platformTimes: post.platformTimes,
            date: post.date,
            status: post.status,
            eventId: post.eventId ?? null,
          },
        ]);
        if (saved) {
          invalidate();
          return;
        }
      }

      setLocalPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        const next = idx === -1 ? [...prev, post] : prev.map((p, i) => (i === idx ? post : p));
        writeLocal(workspaceId, next);
        return next;
      });
    },
    [dbMode, workspaceId, invalidate],
  );

  const removeScheduledPost = useCallback(
    async (postId: string) => {
      if (dbMode) {
        const ok = await deletePostRemote(postId);
        if (ok) {
          invalidate();
          return;
        }
      }
      setLocalPosts((prev) => {
        const next = prev.filter((p) => p.id !== postId);
        writeLocal(workspaceId, next);
        return next;
      });
    },
    [dbMode, workspaceId, invalidate],
  );

  const associatePost = useCallback(
    async (postId: string, eventId: string | undefined) => {
      if (dbMode) {
        const patched = await patchPostRemote(postId, { eventId: eventId ?? null });
        if (patched) {
          invalidate();
          return true;
        }
      }
      setLocalPosts((prev) => {
        const next = prev.map((p) =>
          p.id === postId ? { ...p, eventId: eventId || undefined } : p,
        );
        writeLocal(workspaceId, next);
        return next;
      });
      return true;
    },
    [dbMode, workspaceId, invalidate],
  );

  return {
    posts,
    dbMode,
    isLoading: remote.isLoading,
    addScheduledPosts,
    upsertScheduledPost,
    removeScheduledPost,
    associatePost,
    refetch: invalidate,
  };
}
