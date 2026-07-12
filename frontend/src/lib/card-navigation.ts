/**
 * Navigate from a content card without the retired single-card detail page.
 * Prefer the board that owns the card; otherwise fall back to Cards library filter.
 */
import {
  boardsContainingCardId,
  type StudioBoardId,
  type StudioBoardMeta,
} from "@/lib/studio-boards";
import type { WorkspaceId } from "@/lib/workspaces/types";

export type CardDestination =
  | { kind: "board"; boardId: StudioBoardId; cardId: string; boardName: string }
  | { kind: "library"; cardId: string };

export function resolveCardDestination(
  workspaceId: WorkspaceId,
  cardId: string,
): CardDestination {
  const boards = boardsContainingCardId(workspaceId, cardId);
  if (boards.length === 0) {
    return { kind: "library", cardId };
  }
  // Most recently updated board first (listBoards already sorts by updatedAt desc)
  const board = boards[0] as StudioBoardMeta;
  return {
    kind: "board",
    boardId: board.id,
    cardId,
    boardName: board.name,
  };
}

type NavigateFn = (opts: {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string | undefined>;
  replace?: boolean;
}) => void | Promise<void>;

/** Open owning board + focus card, or Boards library on Cards filter. */
export function openCardDestination(
  workspaceId: WorkspaceId,
  cardId: string,
  navigate: NavigateFn,
  opts?: { replace?: boolean },
): CardDestination {
  const dest = resolveCardDestination(workspaceId, cardId);
  if (dest.kind === "board") {
    void navigate({
      to: "/studio",
      search: {
        board: dest.boardId,
        focusCard: dest.cardId,
      },
      replace: opts?.replace,
    });
  } else {
    void navigate({
      to: "/studio",
      search: {
        library: "cards",
        q: cardId,
        picker: "1",
      },
      replace: opts?.replace,
    });
  }
  return dest;
}
