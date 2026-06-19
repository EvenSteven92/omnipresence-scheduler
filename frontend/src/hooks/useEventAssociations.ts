import { useCallback, useEffect, useState } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";

const STORAGE_PREFIX = "torcc.eventAssociations.";

function storageKey(workspaceId: WorkspaceId): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

function readOverrides(workspaceId: WorkspaceId): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(storageKey(workspaceId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string | null>;
  } catch {
    return {};
  }
}

function writeOverrides(workspaceId: WorkspaceId, map: Record<string, string | null>) {
  try {
    window.sessionStorage.setItem(storageKey(workspaceId), JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function useEventAssociations(workspaceId: WorkspaceId) {
  const [overrides, setOverrides] = useState<Record<string, string | null>>(() =>
    readOverrides(workspaceId),
  );

  useEffect(() => {
    setOverrides(readOverrides(workspaceId));
  }, [workspaceId]);

  const resolveEventId = useCallback(
    (post: Pick<ScheduledPost, "id" | "eventId">): string | undefined => {
      if (post.id in overrides) {
        const value = overrides[post.id];
        return value ?? undefined;
      }
      return post.eventId;
    },
    [overrides],
  );

  const isAssociated = useCallback(
    (post: Pick<ScheduledPost, "id" | "eventId">) => Boolean(resolveEventId(post)),
    [resolveEventId],
  );

  const associate = useCallback(
    (postId: string, eventId: string | undefined) => {
      setOverrides((prev) => {
        const next = { ...prev, [postId]: eventId ?? null };
        writeOverrides(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  return { resolveEventId, isAssociated, associate };
}
