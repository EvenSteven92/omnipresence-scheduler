import type { WorkspaceId } from "@/lib/workspaces/types";

const PREFIX = "omni.studio.eventLayout.";

export type EventLayoutMap = Record<string, { x: number; y: number }>;

export function readEventLayout(workspaceId: WorkspaceId): EventLayoutMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREFIX + workspaceId);
    if (!raw) return {};
    return JSON.parse(raw) as EventLayoutMap;
  } catch {
    return {};
  }
}

export function writeEventLayout(workspaceId: WorkspaceId, map: EventLayoutMap) {
  try {
    window.localStorage.setItem(PREFIX + workspaceId, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function setEventPosition(
  workspaceId: WorkspaceId,
  eventId: string,
  x: number,
  y: number,
) {
  const map = readEventLayout(workspaceId);
  map[eventId] = { x, y };
  writeEventLayout(workspaceId, map);
  return map;
}
