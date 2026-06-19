import type { DraftPost } from "@/components/post/ComposerCard";
import type { WorkspaceId } from "@/lib/workspaces/types";

const QUEUE_PREFIX = "omni.drafts.queue.";
const SAVED_PREFIX = "omni.drafts.saved.";

export interface PersistedDrafts {
  queue: DraftPost[];
  savedDrafts: DraftPost[];
  activeId: string | null;
}

function queueKey(workspaceId: WorkspaceId) {
  return `${QUEUE_PREFIX}${workspaceId}`;
}

function savedKey(workspaceId: WorkspaceId) {
  return `${SAVED_PREFIX}${workspaceId}`;
}

export function readPersistedDrafts(workspaceId: WorkspaceId): PersistedDrafts {
  if (typeof window === "undefined") {
    return { queue: [], savedDrafts: [], activeId: null };
  }
  try {
    const queueRaw = window.localStorage.getItem(queueKey(workspaceId));
    const savedRaw = window.localStorage.getItem(savedKey(workspaceId));
    const queue = queueRaw ? (JSON.parse(queueRaw) as DraftPost[]) : [];
    const savedDrafts = savedRaw ? (JSON.parse(savedRaw) as DraftPost[]) : [];
    const activeId = queue[0]?.id ?? savedDrafts[0]?.id ?? null;
    return { queue, savedDrafts, activeId };
  } catch {
    return { queue: [], savedDrafts: [], activeId: null };
  }
}

export function writePersistedDrafts(
  workspaceId: WorkspaceId,
  queue: DraftPost[],
  savedDrafts: DraftPost[],
) {
  try {
    if (queue.length === 0) window.localStorage.removeItem(queueKey(workspaceId));
    else window.localStorage.setItem(queueKey(workspaceId), JSON.stringify(queue));
    if (savedDrafts.length === 0) window.localStorage.removeItem(savedKey(workspaceId));
    else window.localStorage.setItem(savedKey(workspaceId), JSON.stringify(savedDrafts));
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedDrafts(workspaceId: WorkspaceId) {
  try {
    window.localStorage.removeItem(queueKey(workspaceId));
    window.localStorage.removeItem(savedKey(workspaceId));
  } catch {
    /* ignore */
  }
}
