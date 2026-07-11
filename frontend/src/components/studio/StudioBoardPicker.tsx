import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { StudioBoardCard } from "@/components/studio/StudioBoardCard";
import type { StudioBoardMeta } from "@/lib/studio-boards";
import { defaultBoardName } from "@/lib/studio-boards";
import { cn } from "@/lib/utils";

/**
 * DaVinci Resolve–inspired project gallery: full-width 16:9 board cards.
 * Reusable with a filtered `boards` list (e.g. boards containing a file).
 */
export function StudioBoardPicker({
  boards,
  activeId,
  title = "Boards",
  subtitle = "Pick up a batch or start a new one. Each board keeps its reels — even after you schedule them.",
  showNew = true,
  onOpen,
  onNew,
  onSave,
  onMoveToRecent,
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
  onMoveToRecent?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [name, setName] = useState(() => defaultBoardName());
  const [showSaved, setShowSaved] = useState(false);

  const recent = useMemo(
    () => boards.filter((b) => !b.archived),
    [boards],
  );
  const saved = useMemo(
    () => boards.filter((b) => b.archived),
    [boards],
  );
  const resume = recent.find((b) => b.id === activeId) ?? recent[0] ?? null;

  return (
    <div
      data-testid="studio-board-picker"
      className="flex w-full min-h-0 flex-1 flex-col animate-fade-in"
    >
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4 border-b border-line bg-card px-6 py-5 md:px-8">
        <div className="min-w-0 max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Library
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {showNew && onNew ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultBoardName()}
              className="w-44 rounded-md border border-line bg-paper-2 px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15 sm:w-56"
              data-testid="board-new-name"
            />
            <button
              type="button"
              onClick={() => onNew(name.trim() || defaultBoardName())}
              className="btn-action btn-action-primary inline-flex items-center gap-2 !text-white"
              data-testid="board-new-create"
            >
              <Plus className="h-4 w-4" />
              New board
            </button>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
        {resume ? (
          <section className="mb-8">
            <p className="mb-3 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Continue
            </p>
            <div className="grid max-w-md grid-cols-1">
              <StudioBoardCard
                board={resume}
                isActive={resume.id === activeId}
                onOpen={() => onOpen(resume.id)}
                onSave={onSave ? () => onSave(resume.id) : undefined}
                onDelete={
                  onDelete
                    ? () => {
                        if (
                          window.confirm(
                            `Delete “${resume.name}”? This cannot be undone.`,
                          )
                        ) {
                          onDelete(resume.id);
                        }
                      }
                    : undefined
                }
              />
            </div>
          </section>
        ) : null}

        <section>
          <p className="mb-3 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Recent
          </p>
          {recent.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-12 text-center text-sm text-muted-foreground">
              No boards yet — create one with <strong>New board</strong>.
            </p>
          ) : (
            <StudioBoardGrid>
              {recent.map((b) => (
                <StudioBoardCard
                  key={b.id}
                  board={b}
                  isActive={b.id === activeId}
                  onOpen={() => onOpen(b.id)}
                  onSave={onSave ? () => onSave(b.id) : undefined}
                  onDelete={
                    onDelete
                      ? () => {
                          if (
                            window.confirm(
                              `Delete “${b.name}”? This cannot be undone.`,
                            )
                          ) {
                            onDelete(b.id);
                          }
                        }
                      : undefined
                  }
                />
              ))}
            </StudioBoardGrid>
          )}
        </section>

        {saved.length > 0 ? (
          <section className="mt-10">
            <button
              type="button"
              onClick={() => setShowSaved((v) => !v)}
              className="mb-3 text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
            >
              Saved boards · {saved.length}{" "}
              <span className="font-normal normal-case tracking-normal">
                {showSaved ? "(hide)" : "(show)"}
              </span>
            </button>
            {showSaved ? (
              <StudioBoardGrid>
                {saved.map((b) => (
                  <StudioBoardCard
                    key={b.id}
                    board={b}
                    saved
                    onOpen={() => onOpen(b.id)}
                    onMoveToRecent={
                      onMoveToRecent ? () => onMoveToRecent(b.id) : undefined
                    }
                    onDelete={
                      onDelete
                        ? () => {
                            if (
                              window.confirm(
                                `Delete “${b.name}”? This cannot be undone.`,
                              )
                            ) {
                              onDelete(b.id);
                            }
                          }
                        : undefined
                    }
                  />
                ))}
              </StudioBoardGrid>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** Shared grid — full main width, DaVinci-style multi-column. */
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
        "grid w-full grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
