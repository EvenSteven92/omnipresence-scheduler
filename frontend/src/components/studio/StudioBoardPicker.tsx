import { useMemo, useState } from "react";
import {
  StudioBoardCard,
  StudioNewBoardTile,
} from "@/components/studio/StudioBoardCard";
import type { StudioBoardMeta } from "@/lib/studio-boards";
import { defaultBoardName } from "@/lib/studio-boards";
import { cn } from "@/lib/utils";

/**
 * DaVinci-style library — one grid of all boards (no separate “Saved” section).
 * Autosave keeps every board; Save on canvas is a force-flush only.
 */
export function StudioBoardPicker({
  boards,
  activeId,
  title = "Boards",
  subtitle = "Open a board to continue. Everything autosaves — nothing is lost when you leave.",
  showNew = true,
  onOpen,
  onNew,
  onSave,
  onDelete,
}: {
  boards: StudioBoardMeta[];
  activeId: string | null;
  title?: string;
  subtitle?: string;
  showNew?: boolean;
  onOpen: (id: string) => void;
  onNew?: (name: string) => void;
  onSave?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | "new" | null>(
    activeId,
  );

  // Single list: all boards by updatedAt (listBoards already sorts)
  const allBoards = useMemo(() => boards, [boards]);

  const selectedBoard =
    selectedId && selectedId !== "new"
      ? boards.find((b) => b.id === selectedId)
      : null;

  function confirmDelete(b: StudioBoardMeta) {
    if (window.confirm(`Delete “${b.name}”? This cannot be undone.`)) {
      onDelete?.(b.id);
    }
  }

  return (
    <div
      data-testid="studio-board-picker"
      className="flex w-full min-h-0 flex-1 flex-col animate-fade-in bg-background"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-5 py-3 md:px-8">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Projects
          </p>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-8">
        <StudioBoardGrid>
          {showNew && onNew ? (
            <StudioNewBoardTile
              selected={selectedId === "new"}
              onClick={() => {
                setSelectedId("new");
                onNew(defaultBoardName());
              }}
            />
          ) : null}

          {allBoards.map((b) => (
            <StudioBoardCard
              key={b.id}
              board={b}
              isActive={b.id === activeId}
              selected={selectedId === b.id}
              onSelect={() => setSelectedId(b.id)}
              onOpen={() => onOpen(b.id)}
              onSave={onSave ? () => onSave(b.id) : undefined}
              onDelete={onDelete ? () => confirmDelete(b) : undefined}
            />
          ))}
        </StudioBoardGrid>

        {allBoards.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            No boards yet — click <strong>New board</strong> to start.
          </p>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-5 py-3 md:px-8">
        <p className="text-xs text-muted-foreground">
          {selectedBoard
            ? `Selected: ${selectedBoard.name}`
            : selectedId === "new"
              ? "New board"
              : "Select a board to open"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {showNew && onNew ? (
            <button
              type="button"
              onClick={() => onNew(defaultBoardName())}
              className="btn-action btn-action-secondary min-h-9"
              data-testid="board-new-create"
            >
              New board
            </button>
          ) : null}
          <button
            type="button"
            disabled={!selectedBoard}
            onClick={() => selectedBoard && onOpen(selectedBoard.id)}
            className="btn-action btn-action-primary min-h-9 !text-white disabled:opacity-40"
            data-testid="board-open"
          >
            Open
          </button>
        </div>
      </footer>
    </div>
  );
}

export function StudioBoardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
