/**
 * Multi-board Studio storage — one named canvas snapshot per workspace board.
 * localStorage first; shape ready for a future API.
 */
import type { DraftPost } from "@/lib/composer-draft";
import { isCaptionReady } from "@/lib/studio-layout";
import { readBoardEventIds, writeBoardEventIds } from "@/lib/studio-board-events";
import {
  readEventLayout,
  writeEventLayout,
  type EventLayoutMap,
} from "@/lib/studio-event-layout";
import { readComposerShelf, writeComposerShelf } from "@/lib/draft-storage";
import type { WorkspaceId } from "@/lib/workspaces/types";
import type { ScheduledPost } from "@/lib/mock-data";

export type StudioBoardId = string;

export type StudioBoardSummary = {
  reelCount: number;
  eventCount: number;
  readyCount: number;
  scheduledCount: number;
  liveCount: number;
  /** Up to 4 preview URLs for 16:9 collage on the picker. */
  previewUrls?: string[];
  /** Event titles referenced on this board (for collapsible list). */
  eventTitles?: string[];
};

export type StudioBoardMeta = {
  id: StudioBoardId;
  name: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  summary?: StudioBoardSummary;
};

/** Minimal event payload so board events survive when workspace events clear. */
export type EmbeddedBoardEvent = {
  id: string;
  title: string;
  date: string;
  kind?: string;
  description?: string;
};

export type StudioBoardSnapshot = {
  drafts: DraftPost[];
  boardEventIds: string[];
  eventLayout: EventLayoutMap;
  hiddenIds?: string[];
  /** Stubs for placed events — used when workspace event list is missing the id. */
  embeddedEvents?: EmbeddedBoardEvent[];
};

const INDEX_PREFIX = "omni.studio.boards.index.";
const ACTIVE_PREFIX = "omni.studio.boards.active.";
const DATA_PREFIX = "omni.studio.boards.data.";
const MIGRATED_PREFIX = "omni.studio.boards.migrated.";

function indexKey(ws: WorkspaceId) {
  return INDEX_PREFIX + ws;
}
function activeKey(ws: WorkspaceId) {
  return ACTIVE_PREFIX + ws;
}
function dataKey(ws: WorkspaceId, boardId: StudioBoardId) {
  return `${DATA_PREFIX}${ws}.${boardId}`;
}
function migratedKey(ws: WorkspaceId) {
  return MIGRATED_PREFIX + ws;
}

export function newBoardId(): StudioBoardId {
  return `brd_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function defaultBoardName(d = new Date()): string {
  return `Board · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function emptySnapshot(): StudioBoardSnapshot {
  return {
    drafts: [],
    boardEventIds: [],
    eventLayout: {},
    hiddenIds: [],
    embeddedEvents: [],
  };
}

export function summarizeSnapshot(
  snap: StudioBoardSnapshot,
  scheduledPosts: ScheduledPost[] = [],
  opts?: { eventTitles?: string[]; previewUrls?: string[] },
): StudioBoardSummary {
  const byId = new Map(scheduledPosts.map((p) => [p.id, p]));
  let scheduledCount = 0;
  let liveCount = 0;
  for (const d of snap.drafts) {
    const p = byId.get(d.id);
    if (p?.status === "published") liveCount += 1;
    else if (p?.status === "scheduled") scheduledCount += 1;
  }
  const previewUrls =
    opts?.previewUrls ??
    snap.drafts
      .map((d) => d.previewUrl || d.dropboxDirectUrl || "")
      .filter(Boolean)
      .slice(0, 4);
  return {
    reelCount: snap.drafts.length,
    eventCount: snap.boardEventIds.length,
    readyCount: snap.drafts.filter((d) => isCaptionReady(d)).length,
    scheduledCount,
    liveCount,
    previewUrls: previewUrls.length > 0 ? previewUrls : undefined,
    eventTitles:
      opts?.eventTitles && opts.eventTitles.length > 0
        ? opts.eventTitles
        : undefined,
  };
}

export function listBoards(workspaceId: WorkspaceId): StudioBoardMeta[] {
  const list = readJson<StudioBoardMeta[]>(indexKey(workspaceId), []);
  return [...list].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
}

/** Boards that contain this card id (or a draft cloned from it). Library provenance — not board edit. */
export function boardsContainingCardId(
  workspaceId: WorkspaceId,
  cardId: string,
): StudioBoardMeta[] {
  return listBoards(workspaceId).filter((meta) => {
    const snap = readBoard(workspaceId, meta.id);
    if (!snap) return false;
    return snap.drafts.some(
      (d) => d.id === cardId || d.sourceCardId === cardId,
    );
  });
}

function writeIndex(workspaceId: WorkspaceId, list: StudioBoardMeta[]) {
  writeJson(indexKey(workspaceId), list);
}

export function getActiveBoardId(workspaceId: WorkspaceId): StudioBoardId | null {
  const id = readJson<string | null>(activeKey(workspaceId), null);
  if (!id) return null;
  const exists = listBoards(workspaceId).some((b) => b.id === id);
  return exists ? id : null;
}

export function setActiveBoardId(workspaceId: WorkspaceId, boardId: StudioBoardId | null) {
  try {
    if (!boardId) window.localStorage.removeItem(activeKey(workspaceId));
    else window.localStorage.setItem(activeKey(workspaceId), JSON.stringify(boardId));
  } catch {
    /* ignore */
  }
}

export function readBoard(
  workspaceId: WorkspaceId,
  boardId: StudioBoardId,
): StudioBoardSnapshot | null {
  const snap = readJson<StudioBoardSnapshot | null>(dataKey(workspaceId, boardId), null);
  if (!snap) return null;
  return {
    drafts: Array.isArray(snap.drafts) ? snap.drafts : [],
    boardEventIds: Array.isArray(snap.boardEventIds) ? snap.boardEventIds : [],
    eventLayout: snap.eventLayout && typeof snap.eventLayout === "object" ? snap.eventLayout : {},
    hiddenIds: Array.isArray(snap.hiddenIds) ? snap.hiddenIds : [],
    embeddedEvents: Array.isArray(snap.embeddedEvents) ? snap.embeddedEvents : [],
  };
}

export function writeBoard(
  workspaceId: WorkspaceId,
  boardId: StudioBoardId,
  snapshot: StudioBoardSnapshot,
  scheduledPosts: ScheduledPost[] = [],
  opts?: { eventTitles?: string[] },
) {
  const now = new Date().toISOString();
  writeJson(dataKey(workspaceId, boardId), snapshot);
  const summary = summarizeSnapshot(snapshot, scheduledPosts, {
    eventTitles: opts?.eventTitles,
  });
  const list = listBoards(workspaceId);
  const next = list.map((b) =>
    b.id === boardId ? { ...b, updatedAt: now, summary } : b,
  );
  writeIndex(workspaceId, next);

  // Mirror active board into legacy composer keys for nav badges / old code paths
  if (getActiveBoardId(workspaceId) === boardId) {
    const ready = snapshot.drafts.filter(
      (d) => d.caption.trim() && (d.previewUrl || d.dropboxUrl || d.filename),
    );
    const drafting = snapshot.drafts.filter((d) => !ready.some((r) => r.id === d.id));
    writeComposerShelf(workspaceId, drafting, ready, []);
    writeBoardEventIds(workspaceId, snapshot.boardEventIds);
    writeEventLayout(workspaceId, snapshot.eventLayout);
  }
}

export function createBoard(
  workspaceId: WorkspaceId,
  opts?: { name?: string; snapshot?: StudioBoardSnapshot },
): StudioBoardMeta {
  const now = new Date().toISOString();
  const id = newBoardId();
  const snap = opts?.snapshot ?? emptySnapshot();
  const meta: StudioBoardMeta = {
    id,
    name: opts?.name?.trim() || defaultBoardName(),
    createdAt: now,
    updatedAt: now,
    archived: false,
    summary: summarizeSnapshot(snap),
  };
  writeJson(dataKey(workspaceId, id), snap);
  writeIndex(workspaceId, [meta, ...listBoards(workspaceId)]);
  setActiveBoardId(workspaceId, id);
  return meta;
}

export function renameBoard(workspaceId: WorkspaceId, boardId: StudioBoardId, name: string) {
  const n = name.trim();
  if (!n) return;
  const list = listBoards(workspaceId).map((b) =>
    b.id === boardId ? { ...b, name: n, updatedAt: new Date().toISOString() } : b,
  );
  writeIndex(workspaceId, list);
}

/** Persist board into the Saved library (keeps snapshot; unsets as active). */
export function saveBoard(workspaceId: WorkspaceId, boardId: StudioBoardId) {
  const list = listBoards(workspaceId).map((b) =>
    b.id === boardId
      ? { ...b, archived: true, updatedAt: new Date().toISOString() }
      : b,
  );
  writeIndex(workspaceId, list);
  if (getActiveBoardId(workspaceId) === boardId) {
    const next = list.find((b) => !b.archived);
    setActiveBoardId(workspaceId, next?.id ?? null);
  }
}

/** @deprecated use saveBoard — archived flag means “saved for later” */
export const archiveBoard = saveBoard;

/** Move a saved board back into Recent. */
export function restoreBoard(workspaceId: WorkspaceId, boardId: StudioBoardId) {
  const list = listBoards(workspaceId).map((b) =>
    b.id === boardId
      ? { ...b, archived: false, updatedAt: new Date().toISOString() }
      : b,
  );
  writeIndex(workspaceId, list);
}

export function deleteBoard(workspaceId: WorkspaceId, boardId: StudioBoardId) {
  try {
    window.localStorage.removeItem(dataKey(workspaceId, boardId));
  } catch {
    /* ignore */
  }
  const list = listBoards(workspaceId).filter((b) => b.id !== boardId);
  writeIndex(workspaceId, list);
  if (getActiveBoardId(workspaceId) === boardId) {
    setActiveBoardId(workspaceId, list.find((b) => !b.archived)?.id ?? list[0]?.id ?? null);
  }
}

/**
 * One-time: promote flat workspace Studio data into the first board.
 */
export function migrateLegacyStudioBoard(workspaceId: WorkspaceId): StudioBoardMeta | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(migratedKey(workspaceId)) === "1") {
      return null;
    }
  } catch {
    /* continue */
  }

  const existing = listBoards(workspaceId);
  if (existing.length > 0) {
    try {
      window.localStorage.setItem(migratedKey(workspaceId), "1");
    } catch {
      /* ignore */
    }
    return null;
  }

  const shelf = readComposerShelf(workspaceId);
  const drafts = [...shelf.drafting, ...shelf.ready];
  const boardEventIds = readBoardEventIds(workspaceId);
  const eventLayout = readEventLayout(workspaceId);
  const hasData =
    drafts.length > 0 || boardEventIds.length > 0 || Object.keys(eventLayout).length > 0;

  const meta = createBoard(workspaceId, {
    name: hasData ? "Migrated board" : defaultBoardName(),
    snapshot: {
      drafts,
      boardEventIds,
      eventLayout,
      hiddenIds: [],
    },
  });

  try {
    window.localStorage.setItem(migratedKey(workspaceId), "1");
  } catch {
    /* ignore */
  }
  return meta;
}

export function relativeBoardTime(iso: string): string {
  const t = +new Date(iso);
  if (!Number.isFinite(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatBoardDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Whether a board has work worth offering “save first?” before leaving. */
export function boardHasContent(snap: StudioBoardSnapshot | null | undefined): boolean {
  if (!snap) return false;
  return snap.drafts.length > 0 || snap.boardEventIds.length > 0;
}
