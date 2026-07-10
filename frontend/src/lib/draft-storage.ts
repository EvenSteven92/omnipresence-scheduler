import type { DraftPost } from "@/lib/composer-draft";
import type { WorkspaceId } from "@/lib/workspaces/types";

/** @deprecated legacy single queue key — migrated into drafting on read */
const QUEUE_PREFIX = "omni.drafts.queue.";
const DRAFTING_PREFIX = "omni.drafts.drafting.";
const READY_PREFIX = "omni.drafts.ready.";
const SAVED_PREFIX = "omni.drafts.saved.";

export interface ComposerShelf {
  /** Cards still being composed (media, caption, platforms). */
  drafting: DraftPost[];
  /** Prepared cards waiting for when/where on /schedule. */
  ready: DraftPost[];
  /** Legacy alias used by older compose code — same as drafting. */
  savedDrafts: DraftPost[];
  activeId: string | null;
}

/** @deprecated use ComposerShelf — kept for call sites during migration */
export type PersistedDrafts = ComposerShelf & { queue: DraftPost[] };

function draftingKey(workspaceId: WorkspaceId) {
  return `${DRAFTING_PREFIX}${workspaceId}`;
}
function readyKey(workspaceId: WorkspaceId) {
  return `${READY_PREFIX}${workspaceId}`;
}
function legacyQueueKey(workspaceId: WorkspaceId) {
  return `${QUEUE_PREFIX}${workspaceId}`;
}
function savedKey(workspaceId: WorkspaceId) {
  return `${SAVED_PREFIX}${workspaceId}`;
}

function readJsonArray(key: string): DraftPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DraftPost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, items: DraftPost[]) {
  try {
    if (items.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

/** Card is complete enough to leave compose for scheduling. */
export function isDraftReadyToStage(draft: DraftPost): boolean {
  const hasMedia =
    Boolean(draft.previewUrl) ||
    Boolean(draft.dropboxUrl) ||
    Boolean(draft.filename && draft.filename !== "untitled");
  const hasPlatforms = draft.platforms.length > 0;
  const hasCaption = draft.caption.trim().length > 0;
  return hasMedia && hasPlatforms && hasCaption;
}

export function readComposerShelf(workspaceId: WorkspaceId): ComposerShelf {
  if (typeof window === "undefined") {
    return { drafting: [], ready: [], savedDrafts: [], activeId: null };
  }

  let drafting = readJsonArray(draftingKey(workspaceId));
  // Migrate legacy queue → drafting once
  if (drafting.length === 0) {
    const legacy = readJsonArray(legacyQueueKey(workspaceId));
    if (legacy.length > 0) {
      drafting = legacy;
      writeJsonArray(draftingKey(workspaceId), drafting);
      try {
        window.localStorage.removeItem(legacyQueueKey(workspaceId));
      } catch {
        /* ignore */
      }
    }
  }

  const ready = readJsonArray(readyKey(workspaceId));
  const savedDrafts = readJsonArray(savedKey(workspaceId));
  const activeId = drafting[0]?.id ?? ready[0]?.id ?? savedDrafts[0]?.id ?? null;

  return { drafting, ready, savedDrafts, activeId };
}

/** Back-compat: queue === drafting */
export function readPersistedDrafts(workspaceId: WorkspaceId): PersistedDrafts {
  const shelf = readComposerShelf(workspaceId);
  return { ...shelf, queue: shelf.drafting };
}

export function writeComposerShelf(
  workspaceId: WorkspaceId,
  drafting: DraftPost[],
  ready: DraftPost[],
  savedDrafts: DraftPost[] = [],
) {
  writeJsonArray(draftingKey(workspaceId), drafting);
  writeJsonArray(readyKey(workspaceId), ready);
  writeJsonArray(savedKey(workspaceId), savedDrafts);
  // Keep legacy key cleared so we don't double-load
  try {
    window.localStorage.removeItem(legacyQueueKey(workspaceId));
  } catch {
    /* ignore */
  }
}

export function writePersistedDrafts(
  workspaceId: WorkspaceId,
  queue: DraftPost[],
  savedDrafts: DraftPost[],
) {
  const ready = readComposerShelf(workspaceId).ready;
  writeComposerShelf(workspaceId, queue, ready, savedDrafts);
}

export function writeReadyShelf(workspaceId: WorkspaceId, ready: DraftPost[]) {
  const shelf = readComposerShelf(workspaceId);
  writeComposerShelf(workspaceId, shelf.drafting, ready, shelf.savedDrafts);
}

export function clearPersistedDrafts(workspaceId: WorkspaceId) {
  try {
    window.localStorage.removeItem(draftingKey(workspaceId));
    window.localStorage.removeItem(readyKey(workspaceId));
    window.localStorage.removeItem(savedKey(workspaceId));
    window.localStorage.removeItem(legacyQueueKey(workspaceId));
  } catch {
    /* ignore */
  }
}

export function countReadyCards(workspaceId: WorkspaceId): number {
  return readComposerShelf(workspaceId).ready.length;
}

/** Move drafting → ready (strip times; scheduling page sets them). */
export function stageDraftsAsReady(
  workspaceId: WorkspaceId,
  draftIds: string[],
): { drafting: DraftPost[]; ready: DraftPost[] } {
  const shelf = readComposerShelf(workspaceId);
  const idSet = new Set(draftIds);
  const moving = shelf.drafting
    .filter((d) => idSet.has(d.id))
    .map((d) => ({
      ...d,
      proposedTimes: undefined,
      savedAt: Date.now(),
    }));
  const drafting = shelf.drafting.filter((d) => !idSet.has(d.id));
  // Dedupe ready by id (replace if re-staged)
  const readyMap = new Map(shelf.ready.map((d) => [d.id, d]));
  moving.forEach((d) => readyMap.set(d.id, d));
  const ready = [...readyMap.values()];
  writeComposerShelf(workspaceId, drafting, ready, shelf.savedDrafts);
  return { drafting, ready };
}

/** Send ready card back to compose. */
export function unstageReadyToDrafting(
  workspaceId: WorkspaceId,
  draftId: string,
): { drafting: DraftPost[]; ready: DraftPost[] } {
  const shelf = readComposerShelf(workspaceId);
  const card = shelf.ready.find((d) => d.id === draftId);
  if (!card) return { drafting: shelf.drafting, ready: shelf.ready };
  const ready = shelf.ready.filter((d) => d.id !== draftId);
  const drafting = [...shelf.drafting, { ...card, proposedTimes: undefined }];
  writeComposerShelf(workspaceId, drafting, ready, shelf.savedDrafts);
  return { drafting, ready };
}

/** Remove from ready after successful schedule commit. */
export function removeFromReady(workspaceId: WorkspaceId, draftIds: string[]) {
  const shelf = readComposerShelf(workspaceId);
  const idSet = new Set(draftIds);
  const ready = shelf.ready.filter((d) => !idSet.has(d.id));
  writeComposerShelf(workspaceId, shelf.drafting, ready, shelf.savedDrafts);
  return ready;
}
