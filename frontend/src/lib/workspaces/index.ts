import { WORKSPACES, DEFAULT_WORKSPACE_ID } from "@/lib/workspaces/data";
import { withLiveDates } from "@/lib/workspaces/live-dates";
import type { WorkspaceId, WorkspaceProfile } from "@/lib/workspaces/types";

export type { WorkspaceId, WorkspaceProfile, WorkspaceMetricsBase } from "@/lib/workspaces/types";
export { WORKSPACES, DEFAULT_WORKSPACE_ID };

export function listWorkspaces(): WorkspaceProfile[] {
  return WORKSPACES.map(withLiveDates);
}

export function getWorkspace(id: WorkspaceId): WorkspaceProfile {
  const ws = WORKSPACES.find((w) => w.id === id);
  return withLiveDates(ws ?? WORKSPACES[0]!);
}

export function isWorkspaceId(value: string): value is WorkspaceId {
  return WORKSPACES.some((w) => w.id === value);
}

const STORAGE_KEY = "torcc.activeWorkspaceId";

export function readStoredWorkspaceId(): WorkspaceId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isWorkspaceId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredWorkspaceId(id: WorkspaceId): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
