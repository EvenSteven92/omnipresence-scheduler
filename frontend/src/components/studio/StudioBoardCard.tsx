import { useState } from "react";
import { ChevronDown, MoreHorizontal, Trash2 } from "lucide-react";
import type { StudioBoardMeta } from "@/lib/studio-boards";
import { formatBoardDate, relativeBoardTime } from "@/lib/studio-boards";
import { demoPreviewForPost } from "@/lib/demo-media";
import { cn } from "@/lib/utils";

/**
 * DaVinci-style project card — 16:9 snapshot + meta below.
 * Reusable for full library or filtered “boards containing this file”.
 */
export function StudioBoardCard({
  board,
  isActive,
  saved,
  onOpen,
  onSave,
  onMoveToRecent,
  onDelete,
}: {
  board: StudioBoardMeta;
  isActive?: boolean;
  saved?: boolean;
  onOpen: () => void;
  onSave?: () => void;
  onMoveToRecent?: () => void;
  onDelete?: () => void;
}) {
  const [eventsOpen, setEventsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const previews = board.summary?.previewUrls ?? [];
  const eventTitles = board.summary?.eventTitles ?? [];
  const s = board.summary;

  return (
    <article
      data-testid={`studio-board-card-${board.id}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-150",
        isActive
          ? "border-foreground/40 ring-1 ring-foreground/10"
          : "border-line hover:border-foreground/25",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-video w-full overflow-hidden bg-paper-2 text-left"
        aria-label={`Open ${board.name}`}
      >
        <BoardPreviewCollage
          previews={previews}
          fallbackId={board.id}
          name={board.name}
        />
        {isActive ? (
          <span className="absolute left-2 top-2 rounded bg-foreground px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide text-background">
            Open
          </span>
        ) : null}
        {saved ? (
          <span className="absolute right-2 top-2 rounded border border-line bg-card/90 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide text-muted-foreground">
            Saved
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 flex-1 text-left"
          >
            <h3 className="truncate font-display text-base font-bold leading-snug text-foreground">
              {board.name}
            </h3>
          </button>
          {(onSave || onMoveToRecent || onDelete) && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Board actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-1 min-w-[9rem] rounded-md border border-line bg-card py-1 shadow-[var(--shadow-card)]">
                  {onSave && !saved ? (
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-secondary"
                      onClick={() => {
                        setMenuOpen(false);
                        onSave();
                      }}
                    >
                      Save board
                    </button>
                  ) : null}
                  {onMoveToRecent && saved ? (
                    <button
                      type="button"
                      className="block w-full px-3 py-1.5 text-left text-xs font-semibold hover:bg-secondary"
                      onClick={() => {
                        setMenuOpen(false);
                        onMoveToRecent();
                      }}
                    >
                      Move to recent
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10"
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

        <dl className="space-y-0.5 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-2">
            <dt className="sr-only">Created</dt>
            <dd>Created {formatBoardDate(board.createdAt)}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="sr-only">Last edited</dt>
            <dd>
              Edited {relativeBoardTime(board.updatedAt)}
              <span className="text-muted-foreground/70">
                {" "}
                · {formatBoardDate(board.updatedAt)}
              </span>
            </dd>
          </div>
        </dl>

        {s ? (
          <p className="text-xs text-muted-foreground">
            {s.reelCount} reel{s.reelCount === 1 ? "" : "s"}
            {s.scheduledCount > 0 ? (
              <span className="text-warning">
                {" "}
                · {s.scheduledCount} scheduled
              </span>
            ) : null}
            {s.liveCount > 0 ? (
              <span className="text-success"> · {s.liveCount} live</span>
            ) : null}
            {s.eventCount > 0 ? (
              <span>
                {" "}
                · {s.eventCount} event{s.eventCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
        ) : null}

        {eventTitles.length > 0 ? (
          <div className="mt-1 border-t border-line pt-1.5">
            <button
              type="button"
              onClick={() => setEventsOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-1 text-left text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground"
            >
              Events on this board ({eventTitles.length})
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  eventsOpen && "rotate-180",
                )}
              />
            </button>
            {eventsOpen ? (
              <ul className="mt-1.5 space-y-1 animate-fade-in">
                {eventTitles.map((t) => (
                  <li
                    key={t}
                    className="truncate rounded border border-line bg-paper-2 px-2 py-1 text-xs text-foreground"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
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
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[radial-gradient(circle,_#d6d6d6_1px,_transparent_1px)] bg-[size:16px_16px]">
        <span className="rounded-md border border-line bg-card/90 px-2 py-1 text-caption font-semibold text-muted-foreground">
          Empty board
        </span>
        <span className="max-w-[80%] truncate text-[0.65rem] text-muted-foreground/80">
          {name}
        </span>
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
  while (cells.length < 4 && cells.length > 1) {
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
