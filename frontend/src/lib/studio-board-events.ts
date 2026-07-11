import type { WorkspaceId } from "@/lib/workspaces/types";

const PREFIX = "omni.studio.boardEvents.";

/** Event IDs explicitly placed on the Studio board (working set only). */
export function readBoardEventIds(workspaceId: WorkspaceId): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + workspaceId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeBoardEventIds(workspaceId: WorkspaceId, ids: string[]) {
  try {
    window.localStorage.setItem(PREFIX + workspaceId, JSON.stringify([...new Set(ids)]));
  } catch {
    /* ignore */
  }
}

export function addBoardEventId(workspaceId: WorkspaceId, eventId: string): string[] {
  const next = [...new Set([...readBoardEventIds(workspaceId), eventId])];
  writeBoardEventIds(workspaceId, next);
  return next;
}

export function removeBoardEventId(workspaceId: WorkspaceId, eventId: string): string[] {
  const next = readBoardEventIds(workspaceId).filter((id) => id !== eventId);
  writeBoardEventIds(workspaceId, next);
  return next;
}
