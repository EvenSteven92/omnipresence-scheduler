import { useCallback, useEffect, useState } from "react";
import type { ContentEvent } from "@/lib/workspaces/types";
import type { WorkspaceId } from "@/lib/workspaces/types";

const STORAGE_PREFIX = "torcc.customEvents.";

function storageKey(workspaceId: WorkspaceId): string {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

function readCustomEvents(workspaceId: WorkspaceId): ContentEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    return JSON.parse(raw) as ContentEvent[];
  } catch {
    return [];
  }
}

function writeCustomEvents(workspaceId: WorkspaceId, events: ContentEvent[]) {
  try {
    window.sessionStorage.setItem(storageKey(workspaceId), JSON.stringify(events));
  } catch {
    /* ignore */
  }
}

export function mergeWorkspaceEvents(
  base: ContentEvent[],
  custom: ContentEvent[],
): ContentEvent[] {
  return [...base, ...custom].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function useCustomEvents(workspaceId: WorkspaceId) {
  const [customEvents, setCustomEvents] = useState<ContentEvent[]>(() =>
    readCustomEvents(workspaceId),
  );

  useEffect(() => {
    setCustomEvents(readCustomEvents(workspaceId));
  }, [workspaceId]);

  const addEvent = useCallback(
    (event: ContentEvent) => {
      setCustomEvents((prev) => {
        const next = [...prev, event];
        writeCustomEvents(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  return { customEvents, addEvent };
}