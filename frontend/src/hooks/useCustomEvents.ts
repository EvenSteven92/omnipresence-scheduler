import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContentEvent } from "@/lib/workspaces/types";
import type { WorkspaceId } from "@/lib/workspaces/types";
import { createEventRemote, fetchWorkspaceEvents } from "@/lib/api/posts";

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

export function mergeWorkspaceEvents(base: ContentEvent[], custom: ContentEvent[]): ContentEvent[] {
  const byId = new Map<string, ContentEvent>();
  [...base, ...custom].forEach((e) => byId.set(e.id, e));
  return [...byId.values()].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function useCustomEvents(workspaceId: WorkspaceId) {
  const queryClient = useQueryClient();
  const remote = useQuery({
    queryKey: ["workspace-events", workspaceId],
    queryFn: () => fetchWorkspaceEvents(workspaceId),
    staleTime: 15_000,
  });

  const dbMode = remote.data?.source === "db";
  const [localEvents, setLocalEvents] = useState<ContentEvent[]>(() =>
    readCustomEvents(workspaceId),
  );

  useEffect(() => {
    if (!dbMode) setLocalEvents(readCustomEvents(workspaceId));
  }, [workspaceId, dbMode]);

  const customEvents = dbMode ? (remote.data?.events ?? []) : localEvents;

  const addEvent = useCallback(
    async (event: ContentEvent) => {
      if (dbMode) {
        const created = await createEventRemote(workspaceId, event);
        if (created) {
          void queryClient.invalidateQueries({ queryKey: ["workspace-events", workspaceId] });
          return;
        }
      }
      setLocalEvents((prev) => {
        const next = [...prev, event];
        writeCustomEvents(workspaceId, next);
        return next;
      });
    },
    [dbMode, workspaceId, queryClient],
  );

  /** Upsert into custom overlay (overrides workspace seed events by id). */
  const updateEvent = useCallback(
    (event: ContentEvent) => {
      setLocalEvents((prev) => {
        const idx = prev.findIndex((e) => e.id === event.id);
        const next =
          idx >= 0
            ? prev.map((e) => (e.id === event.id ? event : e))
            : [...prev, event];
        writeCustomEvents(workspaceId, next);
        return next;
      });
    },
    [workspaceId],
  );

  return { customEvents, addEvent, updateEvent, dbMode };
}
