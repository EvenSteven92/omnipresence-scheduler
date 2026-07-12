/**
 * Boards library: enumerate cards across boards, filter, and sort.
 */
import { draftDisplayTitle, type DraftPost } from "@/lib/composer-draft";
import {
  cardStatusFromPost,
  type CardLifecycleStatus,
} from "@/lib/card-display";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import {
  listBoards,
  readBoard,
  type StudioBoardMeta,
} from "@/lib/studio-boards";
import type { WorkspaceId } from "@/lib/workspaces/types";

export type LibraryTypeTab = "all" | "boards" | "cards";
export type LibrarySortKey =
  | "edited"
  | "created"
  | "name"
  | "scheduled"
  | "published";
export type LibrarySortDir = "asc" | "desc";
export type LibraryStatusFilter =
  | "all"
  | "draft"
  | "scheduled"
  | "live"
  | "failed";

export type LibraryCardItem = {
  id: string;
  title: string;
  caption: string;
  hashtags: string;
  previewUrl?: string;
  boardId: string;
  boardName: string;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  status: CardLifecycleStatus;
  draft: DraftPost;
};

function lifecycleFromPost(
  post: ScheduledPost | PublishedPost | undefined,
): CardLifecycleStatus {
  if (!post) return "IDLE";
  if ("status" in post && post.status) return cardStatusFromPost(post);
  if ("engagementRate" in post) return "LIVE";
  return "IDLE";
}

function earliestIso(
  draft: DraftPost,
  post: ScheduledPost | PublishedPost | undefined,
): string | null {
  const times = [
    ...Object.values(post?.platformTimes ?? {}),
    ...Object.values(draft.proposedTimes ?? {}),
    post?.date,
  ].filter(Boolean) as string[];
  if (times.length === 0) return null;
  return times.slice().sort()[0] ?? null;
}

export function enumerateLibraryCards(
  workspaceId: WorkspaceId,
  scheduledPosts: ScheduledPost[],
  publishedPosts: PublishedPost[] = [],
): LibraryCardItem[] {
  const postById = new Map<string, ScheduledPost | PublishedPost>();
  for (const p of publishedPosts) postById.set(p.id, p);
  for (const p of scheduledPosts) postById.set(p.id, p);

  const byId = new Map<string, LibraryCardItem>();
  const boards = listBoards(workspaceId);

  for (const board of boards) {
    const snap = readBoard(workspaceId, board.id);
    if (!snap) continue;
    for (const draft of snap.drafts) {
      const post = postById.get(draft.id);
      const status = lifecycleFromPost(post);
      const scheduledAt =
        status === "SCHEDULED" || status === "FAILED"
          ? earliestIso(draft, post)
          : earliestIso(draft, post);
      const publishedAt =
        status === "LIVE" ? post?.date ?? earliestIso(draft, post) : null;
      const createdAt =
        draft.createdAt ?? board.createdAt ?? new Date().toISOString();
      const updatedAt =
        draft.updatedAt ?? board.updatedAt ?? createdAt;

      const existing = byId.get(draft.id);
      // Prefer most recently updated board as owner
      if (
        existing &&
        +new Date(existing.updatedAt) >= +new Date(board.updatedAt)
      ) {
        continue;
      }

      byId.set(draft.id, {
        id: draft.id,
        title: draftDisplayTitle(draft),
        caption: draft.caption,
        hashtags: draft.hashtags,
        previewUrl: draft.previewUrl || draft.dropboxDirectUrl,
        boardId: board.id,
        boardName: board.name,
        createdAt,
        updatedAt,
        scheduledAt,
        publishedAt,
        status,
        draft,
      });
    }
  }

  // Workspace posts not on any board still appear
  for (const post of [...scheduledPosts, ...publishedPosts]) {
    if (byId.has(post.id)) continue;
    const status = lifecycleFromPost(post);
    byId.set(post.id, {
      id: post.id,
      title: post.title,
      caption: post.caption ?? "",
      hashtags: post.hashtags ?? "",
      previewUrl:
        "previewUrl" in post
          ? (post as { previewUrl?: string }).previewUrl
          : undefined,
      boardId: "",
      boardName: "Not on a board",
      createdAt: post.date,
      updatedAt: post.date,
      scheduledAt: status === "SCHEDULED" ? post.date : null,
      publishedAt: status === "LIVE" ? post.date : null,
      status,
      draft: {
        id: post.id,
        filename: post.title,
        title: post.title,
        mediaKind: "video",
        format: "portrait",
        autoFormat: "portrait",
        platforms: post.platforms,
        caption: post.caption ?? "",
        hashtags: post.hashtags ?? "",
        transcript: "",
      },
    });
  }

  return Array.from(byId.values());
}

export function filterLibraryCards(
  cards: LibraryCardItem[],
  opts: {
    q?: string;
    status?: LibraryStatusFilter;
  },
): LibraryCardItem[] {
  let list = cards;
  const status = opts.status ?? "all";
  if (status !== "all") {
    const map: Record<Exclude<LibraryStatusFilter, "all">, CardLifecycleStatus> =
      {
        draft: "IDLE",
        scheduled: "SCHEDULED",
        live: "LIVE",
        failed: "FAILED",
      };
    const want = map[status];
    list = list.filter((c) => c.status === want);
  }
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    list = list.filter((c) => {
      const hay = `${c.title} ${c.caption} ${c.hashtags} ${c.boardName}`.toLowerCase();
      return hay.includes(q) || c.id.toLowerCase().includes(q);
    });
  }
  return list;
}

export function sortLibraryCards(
  cards: LibraryCardItem[],
  sort: LibrarySortKey,
  dir: LibrarySortDir,
): LibraryCardItem[] {
  const mult = dir === "asc" ? 1 : -1;
  const sorted = [...cards].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "name":
        cmp = a.title.localeCompare(b.title);
        break;
      case "created":
        cmp = +new Date(a.createdAt) - +new Date(b.createdAt);
        break;
      case "scheduled": {
        const aS = a.scheduledAt ? +new Date(a.scheduledAt) : null;
        const bS = b.scheduledAt ? +new Date(b.scheduledAt) : null;
        if (aS == null && bS == null) cmp = 0;
        else if (aS == null) cmp = 1;
        else if (bS == null) cmp = -1;
        else cmp = aS - bS;
        break;
      }
      case "published": {
        const aP = a.publishedAt ? +new Date(a.publishedAt) : null;
        const bP = b.publishedAt ? +new Date(b.publishedAt) : null;
        if (aP == null && bP == null) cmp = 0;
        else if (aP == null) cmp = 1;
        else if (bP == null) cmp = -1;
        else cmp = aP - bP;
        break;
      }
      case "edited":
      default:
        cmp = +new Date(a.updatedAt) - +new Date(b.updatedAt);
        break;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return cmp * mult;
  });
  return sorted;
}

export function filterLibraryBoards(
  boards: StudioBoardMeta[],
  q?: string,
): StudioBoardMeta[] {
  const query = q?.trim().toLowerCase();
  if (!query) return boards;
  return boards.filter((b) => b.name.toLowerCase().includes(query));
}

export function sortLibraryBoards(
  boards: StudioBoardMeta[],
  sort: LibrarySortKey,
  dir: LibrarySortDir,
): StudioBoardMeta[] {
  const mult = dir === "asc" ? 1 : -1;
  return [...boards].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "name":
        cmp = a.name.localeCompare(b.name);
        break;
      case "created":
        cmp = +new Date(a.createdAt) - +new Date(b.createdAt);
        break;
      case "scheduled":
      case "published":
      case "edited":
      default:
        cmp = +new Date(a.updatedAt) - +new Date(b.updatedAt);
        break;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return cmp * mult;
  });
}

export function formatLibraryMetaDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(+d)) return "—";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year:
        d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "—";
  }
}
