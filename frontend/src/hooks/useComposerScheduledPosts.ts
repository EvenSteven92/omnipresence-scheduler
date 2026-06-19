import { useCallback, useEffect, useState } from "react";
import type { DraftPost } from "@/components/post/ComposerCard";
import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";

const STORAGE_PREFIX = "torcc.composerScheduled.";

function storageKey(workspaceId: WorkspaceId): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

function readComposerScheduledPosts(workspaceId: WorkspaceId): ScheduledPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    return JSON.parse(raw) as ScheduledPost[];
  } catch {
    return [];
  }
}

function writeComposerScheduledPosts(workspaceId: WorkspaceId, posts: ScheduledPost[]) {
  try {
    window.sessionStorage.setItem(storageKey(workspaceId), JSON.stringify(posts));
  } catch {
    /* ignore */
  }
}

export function mergeScheduledPosts(
  base: ScheduledPost[],
  custom: ScheduledPost[],
): ScheduledPost[] {
  const seen = new Set(base.map((p) => p.id));
  const merged = [...base];
  custom.forEach((p) => {
    if (!seen.has(p.id)) merged.push(p);
  });
  return merged.sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export function draftToScheduledPost(draft: DraftPost): ScheduledPost | null {
  if (draft.platforms.length === 0) return null;
  const times = draft.proposedTimes ?? {};
  if (!draft.platforms.every((p) => Boolean(times[p]))) return null;
  const isos = draft.platforms.map((p) => times[p]!).sort();
  return {
    id: draft.id,
    title: draft.caption?.trim() || draft.filename,
    platforms: draft.platforms,
    date: isos[0]!,
    platformTimes: times,
    status: "scheduled",
    eventId: draft.eventId,
  };
}

export function useComposerScheduledPosts(workspaceId: WorkspaceId) {
  const [composerScheduled, setComposerScheduled] = useState<ScheduledPost[]>(() =>
    readComposerScheduledPosts(workspaceId),
  );

  useEffect(() => {
    setComposerScheduled(readComposerScheduledPosts(workspaceId));
  }, [workspaceId]);

  const addScheduledPosts = useCallback(
    (posts: ScheduledPost[]) => {
      if (posts.length === 0) return;
      setComposerScheduled((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = [...prev];
        posts.forEach((p) => {
          if (!seen.has(p.id)) next.push(p);
        });
        writeComposerScheduledPosts(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  return { composerScheduled, addScheduledPosts };
}
