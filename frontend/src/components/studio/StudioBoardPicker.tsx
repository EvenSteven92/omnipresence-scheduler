import { Archive, Clock, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { StudioBoardMeta } from "@/lib/studio-boards";
import { defaultBoardName, relativeBoardTime } from "@/lib/studio-boards";
import { cn } from "@/lib/utils";

/**
 * Session-like chooser: new board, resume, archive.
 */
export function StudioBoardPicker({
  boards,
  activeId,
  onOpen,
  onNew,
  onArchive,
  onRestore,
  onDelete,
}: {
  boards: StudioBoardMeta[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onNew: (name: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(() => defaultBoardName());
  const [showArchived, setShowArchived] = useState(false);

  const active = useMemo(
    () => boards.filter((b) => !b.archived),
    [boards],
  );
  const archived = useMemo(
    () => boards.filter((b) => b.archived),
    [boards],
  );
  const resume = active.find((b) => b.id === activeId) ?? active[0] ?? null;

  return (
    <div
      data-testid="studio-board-picker"
      className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6 animate-fade-in md:p-10"
    >
      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Studio
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
          Boards
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Each board is a batch — open a draft, start fresh, or revisit scheduled
          work. Cards stay on the board after you schedule them.
        </p>
      </div>

      {resume ? (
        <button
          type="button"
          onClick={() => onOpen(resume.id)}
          className="flex w-full items-start gap-3 rounded-lg border border-foreground bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-paper-2"
          data-testid="board-resume"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
            <FolderOpen className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Continue
            </span>
            <span className="mt-0.5 block truncate font-display text-lg font-bold text-foreground">
              {resume.name}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {relativeBoardTime(resume.updatedAt)}
              {resume.summary ? (
                <>
                  <span>·</span>
                  <span>{resume.summary.reelCount} reels</span>
                  {resume.summary.scheduledCount > 0 ? (
                    <span className="text-warning">
                      · {resume.summary.scheduledCount} scheduled
                    </span>
                  ) : null}
                  {resume.summary.liveCount > 0 ? (
                    <span className="text-success">
                      · {resume.summary.liveCount} live
                    </span>
                  ) : null}
                </>
              ) : null}
            </span>
          </span>
        </button>
      ) : null}

      <section className="rounded-lg border border-line bg-card p-4">
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          New board
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={defaultBoardName()}
            className="min-w-0 flex-1 rounded-md border border-line bg-paper-2 px-3 py-2.5 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
            data-testid="board-new-name"
          />
          <button
            type="button"
            onClick={() => onNew(name.trim() || defaultBoardName())}
            className="btn-action btn-action-primary inline-flex shrink-0 items-center justify-center gap-2 !text-white"
            data-testid="board-new-create"
          >
            <Plus className="h-4 w-4" />
            Start new board
          </button>
        </div>
      </section>

      <section>
        <p className="mb-2 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Recent
        </p>
        {active.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">
            No boards yet — start a new one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((b) => (
              <BoardRow
                key={b.id}
                board={b}
                isActive={b.id === activeId}
                onOpen={() => onOpen(b.id)}
                onArchive={() => onArchive(b.id)}
                onDelete={() => onDelete(b.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 ? (
        <section>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="mb-2 flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
          >
            <Archive className="h-3.5 w-3.5" />
            Archived · {archived.length}
            <span className="font-normal normal-case tracking-normal">
              {showArchived ? "(hide)" : "(show)"}
            </span>
          </button>
          {showArchived ? (
            <ul className="space-y-2">
              {archived.map((b) => (
                <BoardRow
                  key={b.id}
                  board={b}
                  archived
                  onOpen={() => onOpen(b.id)}
                  onRestore={() => onRestore(b.id)}
                  onDelete={() => onDelete(b.id)}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function BoardRow({
  board,
  isActive,
  archived,
  onOpen,
  onArchive,
  onRestore,
  onDelete,
}: {
  board: StudioBoardMeta;
  isActive?: boolean;
  archived?: boolean;
  onOpen: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 transition-colors",
        isActive ? "border-foreground/30" : "border-line",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-sm font-semibold text-foreground">
          {board.name}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {relativeBoardTime(board.updatedAt)}
          {board.summary
            ? ` · ${board.summary.reelCount} reels${
                board.summary.scheduledCount
                  ? ` · ${board.summary.scheduledCount} scheduled`
                  : ""
              }${
                board.summary.liveCount
                  ? ` · ${board.summary.liveCount} live`
                  : ""
              }`
            : ""}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {archived && onRestore ? (
          <button
            type="button"
            onClick={onRestore}
            className="rounded-md px-2 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
          >
            Restore
          </button>
        ) : null}
        {!archived && onArchive ? (
          <button
            type="button"
            title="Archive"
            onClick={onArchive}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          title="Delete permanently"
          onClick={() => {
            if (
              window.confirm(
                `Delete “${board.name}”? This cannot be undone.`,
              )
            ) {
              onDelete();
            }
          }}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
