import { useCallback, useEffect, useState } from "react";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";
import {
  markPostDeleted,
  mergeScheduledPosts,
  readScheduledPosts,
  writeScheduledPosts,
} from "@/lib/scheduled-posts-storage";

export { mergeScheduledPosts };

export function draftToScheduledPost(draft: DraftPost): ScheduledPost | null {
  if (draft.platforms.length === 0) return null;
  const times = draft.proposedTimes ?? {};
  if (!draft.platforms.every((p) => Boolean(times[p]))) return null;
  const isos = draft.platforms.map((p) => times[p]!).sort();
  return {
    id: draft.id,
    title: draftDisplayTitle(draft),
    platforms: draft.platforms,
    date: isos[0]!,
    platformTimes: times,
    status: "scheduled",
    eventId: draft.eventId,
    caption: draft.caption || undefined,
    hashtags: draft.hashtags || undefined,
    transcript: draft.transcript || undefined,
    callToAction: draft.callToAction || undefined,
    platformTitles: draft.platformTitles,
    platformCaptions: draft.platformCaptions,
    platformHashtags: draft.platformHashtags,
    sourceCardId: draft.sourceCardId,
    dropboxUrl: draft.dropboxUrl,
    dropboxDirectUrl: draft.dropboxDirectUrl,
    previewUrl: draft.previewUrl ?? draft.dropboxDirectUrl,
    localMediaId: draft.localMediaId,
  };
}

/** @deprecated Prefer usePersistedPosts — kept for any residual call sites. */
export function useComposerScheduledPosts(workspaceId: WorkspaceId) {
  const [composerScheduled, setComposerScheduled] = useState<ScheduledPost[]>(() =>
    readScheduledPosts(workspaceId),
  );

  useEffect(() => {
    setComposerScheduled(readScheduledPosts(workspaceId));
  }, [workspaceId]);

  const addScheduledPosts = useCallback(
    (posts: ScheduledPost[]) => {
      if (posts.length === 0) return;
      setComposerScheduled((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]));
        posts.forEach((p) => byId.set(p.id, p));
        const next = Array.from(byId.values());
        writeScheduledPosts(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  const upsertScheduledPost = useCallback(
    (post: ScheduledPost) => {
      setComposerScheduled((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        const next = idx === -1 ? [...prev, post] : prev.map((p, i) => (i === idx ? post : p));
        writeScheduledPosts(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  const removeScheduledPost = useCallback(
    (postId: string) => {
      setComposerScheduled((prev) => {
        const next = prev.filter((p) => p.id !== postId);
        writeScheduledPosts(workspaceId, next);
        return next;
      });
      markPostDeleted(workspaceId, postId);
    },
    [workspaceId],
  );

  return { composerScheduled, addScheduledPosts, upsertScheduledPost, removeScheduledPost };
}
