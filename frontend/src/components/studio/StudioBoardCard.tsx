import { useEffect, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { StudioBoardMeta } from "@/lib/studio-boards";
import { formatBoardDate, relativeBoardTime } from "@/lib/studio-boards";
import { demoPreviewForPost } from "@/lib/demo-media";
import { cn } from "@/lib/utils";

/**
 * DaVinci Resolve–style project cell: 16:9 frame, title under, light meta.
 */
export function StudioBoardCard({
  board,
  isActive,
  selected,
  onOpen,
  onSelect,
  onSave,
  onRename,
  onDelete,
}: {
  board: StudioBoardMeta;
  isActive?: boolean;
  selected?: boolean;
  onOpen: () => void;
  onSelect?: () => void;
  onSave?: () => void;
  onRename?: (name: string) => void;
  onDelete?: () => void;
}) {
  const [eventsOpen, setEventsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(board.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = board.summary?.previewUrls ?? [];
  const eventTitles = board.summary?.eventTitles ?? [];
  const s = board.summary;

  useEffect(() => {
    setNameDraft(board.name);
  }, [board.name]);

  useEffect(() => {
    if (renaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [renaming]);

  function commitRename() {
    const next = nameDraft.trim();
    setRenaming(false);
    if (next && next !== board.name) onRename?.(next);
    else setNameDraft(board.name);
  }

  return (
    <article
      data-testid={`studio-board-card-${board.id}`}
      className="group flex flex-col"
    >
      <button
        type="button"
        onClick={() => {
          onSelect?.();
          onOpen();
        }}
        onFocus={onSelect}
        className={cn(
          "relative aspect-video w-full overflow-hidden rounded-md border-2 bg-paper-2 text-left transition-[border-color,box-shadow,transform] duration-150",
          selected || isActive
            ? "border-brand shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand)_40%,transparent)]"
            : "border-transparent ring-1 ring-line hover:ring-foreground/25",
        )}
        aria-label={`Open ${board.name}`}
      >
        <BoardPreviewCollage
          previews={previews}
          fallbackId={board.id}
          name={board.name}
        />
      </button>

      <div className="mt-2 flex items-start gap-1 px-0.5">
        {renaming ? (
          <input
            ref={inputRef}
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setNameDraft(board.name);
                setRenaming(false);
              }
            }}
            className="min-w-0 flex-1 rounded border border-line bg-card px-1.5 py-0.5 text-center text-sm font-medium text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
            data-testid={`board-rename-input-${board.id}`}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              onSelect?.();
              onOpen();
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onRename) setRenaming(true);
            }}
            className="min-w-0 flex-1 text-center"
          >
            <h3
              className={cn(
                "truncate text-sm font-medium leading-snug",
                selected || isActive
                  ? "text-foreground"
                  : "text-muted-foreground",
                "group-hover:text-foreground",
              )}
            >
              {board.name}
            </h3>
            <p className="mt-1 space-y-0.5 text-left">
              <span className="block font-mono text-[0.58rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Created{" "}
                <span className="font-sans font-medium normal-case tracking-normal text-foreground/80">
                  {formatBoardDate(board.createdAt) || "—"}
                </span>
                <span className="mx-1 text-muted-foreground/50">·</span>
                Edited{" "}
                <span className="font-sans font-medium normal-case tracking-normal text-foreground/80">
                  {relativeBoardTime(board.updatedAt) || "—"}
                </span>
              </span>
              {s && s.reelCount > 0 ? (
                <span className="block text-[0.65rem] text-muted-foreground">
                  {s.reelCount} reel{s.reelCount === 1 ? "" : "s"}
                  {s.scheduledCount > 0
                    ? ` · ${s.scheduledCount} scheduled`
                    : ""}
                  {s.liveCount > 0 ? ` · ${s.liveCount} live` : ""}
                </span>
              ) : null}
            </p>
          </button>
        )}
        {(onSave || onRename || onDelete) && !renaming && (
          <div className="relative shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Board actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-md border border-line bg-card py-1 shadow-[var(--shadow-card)]">
                {onRename ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold hover:bg-secondary"
                    onClick={() => {
                      setMenuOpen(false);
                      setRenaming(true);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                    Rename
                  </button>
                ) : null}
                {onSave ? (
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-secondary"
                    onClick={() => {
                      setMenuOpen(false);
                      onSave();
                    }}
                  >
                    Save now
                  </button>
                ) : null}
                <p className="border-t border-line px-3 py-1.5 text-[0.6rem] text-muted-foreground">
                  Created {formatBoardDate(board.createdAt)}
                </p>
                {eventTitles.length > 0 ? (
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs font-semibold hover:bg-secondary"
                    onClick={() => setEventsOpen((o) => !o)}
                  >
                    Events ({eventTitles.length})
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        eventsOpen && "rotate-180",
                      )}
                    />
                  </button>
                ) : null}
                {eventsOpen
                  ? eventTitles.map((t) => (
                      <p
                        key={t}
                        className="truncate px-3 py-0.5 text-[0.65rem] text-muted-foreground"
                      >
                        {t}
                      </p>
                    ))
                  : null}
                {onDelete ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-1.5 border-t border-line px-3 py-1.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

export function StudioNewBoardTile({
  selected,
  onClick,
}: {
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col" data-testid="board-new-tile">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border-2 bg-paper-2 transition-[border-color,box-shadow] duration-150",
          selected
            ? "border-brand shadow-[0_0_0_1px_color-mix(in_oklab,var(--brand)_40%,transparent)]"
            : "border-transparent ring-1 ring-line hover:ring-foreground/30",
        )}
        aria-label="New board"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
          <span className="font-display text-3xl font-light leading-none text-foreground/70">
            +
          </span>
        </span>
      </button>
      <p className="mt-2 text-center text-sm font-medium text-foreground">
        New board
      </p>
    </div>
  );
}

function BoardPreviewCollage({
  previews,
  fallbackId,
  name,
}: {
  previews: string[];
  fallbackId: string;
  name: string;
}) {
  if (previews.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-secondary/40">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <span className="font-display text-lg font-bold tracking-tight">O</span>
        </span>
        <span className="sr-only">{name}</span>
      </div>
    );
  }

  if (previews.length === 1) {
    return (
      <img
        src={previews[0]}
        alt=""
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
      />
    );
  }

  const cells = previews.slice(0, 4);
  while (cells.length < 4 && cells.length >= 2) {
    cells.push(
      demoPreviewForPost({ id: `${fallbackId}-${cells.length}`, title: name }),
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-line">
      {cells.slice(0, 4).map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt=""
          className="h-full w-full object-cover"
        />
      ))}
    </div>
  );
}
