import { CalendarDays, Eye, EyeOff, Film, X } from "lucide-react";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import type { ContentEvent } from "@/lib/workspaces/types";
import { demoPreviewForPost } from "@/lib/demo-media";
import { cn } from "@/lib/utils";

/**
 * Photoshop-inspired layers list — Media + Events on the board working set.
 */
export function StudioLayersPanel({
  open,
  drafts,
  boardEvents,
  offBoardEvents = [],
  selectedIds,
  selectedEventId,
  hiddenIds,
  onClose,
  onSelectDraft,
  onSelectEvent,
  onToggleHidden,
  onRemoveEventFromBoard,
  onNewEvent,
  onPlaceEvent,
}: {
  open: boolean;
  drafts: DraftPost[];
  boardEvents: ContentEvent[];
  /** Workspace events not yet on the board (opt-in place). */
  offBoardEvents?: ContentEvent[];
  selectedIds: Set<string>;
  selectedEventId: string | null;
  hiddenIds: Set<string>;
  onClose: () => void;
  onSelectDraft: (id: string) => void;
  onSelectEvent: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onRemoveEventFromBoard: (id: string) => void;
  onNewEvent: () => void;
  onPlaceEvent?: (id: string) => void;
}) {
  return (
    <aside
      data-studio-layers="true"
      data-testid="studio-layers-panel"
      className={cn(
        "fixed bottom-0 left-0 top-14 z-30 flex w-[15.5rem] flex-col border-r border-line bg-card shadow-[4px_0_24px_rgba(0,0,0,0.06)]",
        "transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] md:top-[4.25rem]",
        open
          ? "translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-full opacity-0",
      )}
      aria-hidden={!open}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2.5">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Layers
          </p>
          <p className="text-xs text-muted-foreground">Board working set</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close layers"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-line py-2">
          <p className="px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Media · {drafts.length}
          </p>
          {drafts.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No reels on board</p>
          ) : (
            <ul className="space-y-0.5 px-1.5">
              {drafts.map((d) => {
                const hidden = hiddenIds.has(d.id);
                const sel = selectedIds.has(d.id);
                return (
                  <li key={d.id}>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors duration-100",
                        sel ? "bg-brand-soft" : "hover:bg-secondary/80",
                        hidden && "opacity-50",
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => onSelectDraft(d.id)}
                      >
                        <span className="h-7 w-7 shrink-0 overflow-hidden rounded border border-line bg-paper-2">
                          <img
                            src={
                              d.previewUrl ||
                              demoPreviewForPost({ id: d.id, title: d.filename })
                            }
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 truncate text-xs font-semibold text-foreground">
                            <Film className="h-3 w-3 shrink-0 text-muted-foreground" />
                            {draftDisplayTitle(d)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        title={hidden ? "Show" : "Hide"}
                        onClick={() => onToggleHidden(d.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        {hidden ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="py-2">
          <div className="flex items-center justify-between px-3 pb-1.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Events · {boardEvents.length}
            </p>
            <button
              type="button"
              onClick={onNewEvent}
              className="text-[0.65rem] font-semibold text-foreground underline-offset-2 hover:underline"
            >
              + New
            </button>
          </div>
          {boardEvents.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No events on board — add with New, or place a past event below
            </p>
          ) : (
            <ul className="space-y-0.5 px-1.5">
              {boardEvents.map((ev) => {
                const hidden = hiddenIds.has(`event:${ev.id}`);
                const sel = selectedEventId === ev.id;
                return (
                  <li key={ev.id}>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors duration-100",
                        sel ? "bg-brand-soft" : "hover:bg-secondary/80",
                        hidden && "opacity-50",
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => onSelectEvent(ev.id)}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line bg-paper-2">
                          <CalendarDays className="h-3.5 w-3.5 text-foreground" />
                        </span>
                        <span className="truncate text-xs font-semibold text-foreground">
                          {ev.title}
                        </span>
                      </button>
                      <button
                        type="button"
                        title={hidden ? "Show" : "Hide"}
                        onClick={() => onToggleHidden(`event:${ev.id}`)}
                        className="rounded p-1 text-muted-foreground hover:bg-secondary"
                      >
                        {hidden ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Remove from board"
                        onClick={() => onRemoveEventFromBoard(ev.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {offBoardEvents.length > 0 && onPlaceEvent ? (
            <div className="mt-2 border-t border-line pt-2">
              <p className="px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Place from workspace
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto px-1.5">
                {offBoardEvents.slice(0, 24).map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onPlaceEvent(ev.id)}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-100 hover:bg-secondary/80"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-dashed border-line bg-paper-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-foreground">
                          {ev.title}
                        </span>
                        <span className="block text-[0.6rem] text-muted-foreground">
                          Click to place
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
