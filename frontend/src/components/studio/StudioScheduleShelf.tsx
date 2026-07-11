import { GripVertical, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProposedScheduleCalendar } from "@/components/schedule/ProposedScheduleCalendar";
import { PlatformDestinationPicker } from "@/components/composer/PlatformDestinationPicker";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import type { Platform, ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import {
  combineDateAndTime,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/schedule-engine";
import { demoPreviewForPost } from "@/lib/demo-media";
import { cn } from "@/lib/utils";

const WIDTH_KEY = "omni.studio.scheduleShelfWidth";
const MIN_W = 320;
const MAX_W = 720;
const DEFAULT_W = 420;

function clampWidth(w: number) {
  if (typeof window === "undefined") return Math.min(MAX_W, Math.max(MIN_W, w));
  return Math.min(Math.min(MAX_W, window.innerWidth * 0.7), Math.max(MIN_W, w));
}

export function StudioScheduleShelf({
  open,
  drafts,
  focusId,
  committedPosts,
  events,
  workspacePlatforms,
  busy,
  onClose,
  onFocus,
  onChangeDraft,
  onBestTimes,
  onCommit,
  onWidthChange,
  onAssignEvent,
}: {
  open: boolean;
  drafts: DraftPost[];
  focusId: string | null;
  committedPosts: ScheduledPost[];
  events: ContentEvent[];
  workspacePlatforms: Platform[];
  busy?: boolean;
  onClose: () => void;
  onFocus: (id: string) => void;
  onChangeDraft: (id: string, updater: (d: DraftPost) => DraftPost) => void;
  onBestTimes: () => void;
  onCommit: () => void;
  onWidthChange?: (w: number) => void;
  onAssignEvent: (eventId: string) => void;
}) {
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_W;
    const raw = window.localStorage.getItem(WIDTH_KEY);
    const n = raw ? Number(raw) : DEFAULT_W;
    return clampWidth(Number.isFinite(n) ? n : DEFAULT_W);
  });
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    onWidthChange?.(open ? width : 0);
  }, [open, width, onWidthChange]);

  const onResizeDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = { startX: e.clientX, startW: width };
    },
    [width],
  );

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = dragRef.current.startX - e.clientX;
    const next = clampWidth(dragRef.current.startW + dx);
    setWidth(next);
  }, []);

  const onResizeUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      dragRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      try {
        window.localStorage.setItem(WIDTH_KEY, String(width));
      } catch {
        /* ignore */
      }
    },
    [width],
  );

  const focus = drafts.find((d) => d.id === focusId) ?? drafts[0] ?? null;
  const canCommit = drafts.length > 0;

  return (
    <aside
      data-testid="studio-schedule-shelf"
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex flex-col border-l border-line bg-card",
        "shadow-[-8px_0_24px_rgba(0,0,0,0.06)]",
        "transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "translate-x-full pointer-events-none",
      )}
      style={{ width }}
      aria-hidden={!open}
    >
      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize schedule panel"
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        className="absolute inset-y-0 left-0 z-10 flex w-3 -translate-x-1/2 cursor-col-resize items-center justify-center"
      >
        <span className="flex h-10 w-1.5 items-center justify-center rounded-full bg-line hover:bg-foreground/30">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </span>
      </div>

      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 pl-5">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Schedule
          </p>
          <h2 className="mt-0.5 font-display text-base font-bold text-foreground">
            {drafts.length === 0
              ? "No reels selected"
              : drafts.length === 1
                ? draftDisplayTitle(drafts[0]!)
                : `${drafts.length} reels`}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close schedule panel"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pl-5">
        {/* Selection strip */}
        {drafts.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {drafts.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onFocus(d.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                    focus?.id === d.id
                      ? "border-foreground bg-secondary"
                      : "border-line bg-paper-2 hover:border-foreground/30",
                  )}
                >
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded border border-line">
                    <img
                      src={
                        d.previewUrl ||
                        demoPreviewForPost({ id: d.id, title: d.filename })
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="max-w-[7rem] truncate text-caption font-semibold">
                    {draftDisplayTitle(d)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Attach to event */}
        {events.length > 0 && drafts.length > 0 ? (
          <section className="rounded-lg border border-line bg-paper-2 p-3">
            <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              String to event
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Link selected reels to a ministry event card.
            </p>
            <select
              className="mt-2 w-full rounded-md border border-line bg-card px-2 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) onAssignEvent(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Choose event…
              </option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </section>
        ) : null}

        {/* Week / month calendar */}
        {drafts.length > 0 ? (
          <ProposedScheduleCalendar
            drafts={drafts}
            committedPosts={committedPosts}
            highlightedIds={new Set(drafts.map((d) => d.id))}
            focusId={focus?.id}
            onFocusCard={onFocus}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">
            Select caption-ready reels on the board, then open Schedule.
          </p>
        )}

        {/* Destinations + times for focus card */}
        {focus ? (
          <section className="space-y-3 rounded-lg border border-line p-3">
            <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Destinations & times
            </p>
            <p className="text-xs text-muted-foreground">
              Editing:{" "}
              <span className="font-semibold text-foreground">
                {draftDisplayTitle(focus)}
              </span>
            </p>
            <PlatformDestinationPicker
              draft={focus}
              workspacePlatforms={workspacePlatforms}
              onChange={(platforms) =>
                onChangeDraft(focus.id, (d) => ({ ...d, platforms }))
              }
            />
            {focus.platforms.length > 0 ? (
              <ul className="space-y-2">
                {focus.platforms.map((p) => {
                  const iso = focus.proposedTimes?.[p];
                  const dateStr = iso ? toDateInputValue(new Date(iso)) : "";
                  const timeStr = iso ? toTimeInputValue(iso) : "";
                  return (
                    <li
                      key={p}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-paper-2 px-2 py-1.5"
                    >
                      <span className="w-16 shrink-0 text-caption font-semibold">
                        {p}
                      </span>
                      <input
                        type="date"
                        value={dateStr}
                        onChange={(e) => {
                          const isoNext = combineDateAndTime(
                            e.target.value,
                            timeStr || "12:00",
                          );
                          onChangeDraft(focus.id, (d) => ({
                            ...d,
                            proposedTimes: {
                              ...(d.proposedTimes ?? {}),
                              [p]: isoNext,
                            },
                          }));
                        }}
                        className="min-w-0 flex-1 rounded border border-line bg-card px-1.5 py-1 text-xs focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                      <input
                        type="time"
                        value={timeStr}
                        onChange={(e) => {
                          const isoNext = combineDateAndTime(
                            dateStr || toDateInputValue(new Date()),
                            e.target.value,
                          );
                          onChangeDraft(focus.id, (d) => ({
                            ...d,
                            proposedTimes: {
                              ...(d.proposedTimes ?? {}),
                              [p]: isoNext,
                            },
                          }));
                        }}
                        className="w-[5.5rem] rounded border border-line bg-card px-1.5 py-1 text-xs focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-wrap gap-2 border-t border-line p-4 pl-5">
        <button
          type="button"
          onClick={onBestTimes}
          disabled={busy || drafts.length === 0}
          className="btn-action btn-action-secondary min-h-10 flex-1 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Best times
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={!canCommit || busy}
          data-testid="shelf-schedule-commit"
          className="btn-action btn-action-primary min-h-10 flex-1 !text-white disabled:opacity-50"
        >
          Schedule {drafts.length > 1 ? `${drafts.length} reels` : "reel"}
        </button>
      </footer>
    </aside>
  );
}
