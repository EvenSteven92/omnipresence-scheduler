import { Check, ChevronDown, GripVertical, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProposedScheduleCalendar } from "@/components/schedule/ProposedScheduleCalendar";
import { PlatformDestinationPicker } from "@/components/composer/PlatformDestinationPicker";
import { TrafficLight } from "@/components/ui/TrafficLight";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import type { Platform, ScheduledPost } from "@/lib/mock-data";
import {
  combineDateAndTime,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/schedule-engine";
import { demoPreviewForPost } from "@/lib/demo-media";
import {
  isScheduleTimed,
  timedProgressLabel,
} from "@/lib/studio-layout";
import { cn } from "@/lib/utils";

const WIDTH_KEY = "omni.studio.scheduleShelfWidth";
const MIN_W = 320;
const MAX_W = 720;
const DEFAULT_W = 420;

function clampWidth(w: number) {
  if (typeof window === "undefined") return Math.min(MAX_W, Math.max(MIN_W, w));
  return Math.min(Math.min(MAX_W, window.innerWidth * 0.7), Math.max(MIN_W, w));
}

function DestTimesForDraft({
  draft,
  workspacePlatforms,
  onChangeDraft,
}: {
  draft: DraftPost;
  workspacePlatforms: Platform[];
  onChangeDraft: (id: string, updater: (d: DraftPost) => DraftPost) => void;
}) {
  return (
    <div className="space-y-3">
      <PlatformDestinationPicker
        draft={draft}
        workspacePlatforms={workspacePlatforms}
        onChange={(platforms) =>
          onChangeDraft(draft.id, (d) => ({ ...d, platforms }))
        }
      />
      {draft.platforms.length > 0 ? (
        <ul className="space-y-2">
          {draft.platforms.map((p) => {
            const iso = draft.proposedTimes?.[p];
            const dateStr = iso ? toDateInputValue(new Date(iso)) : "";
            const timeStr = iso ? toTimeInputValue(iso) : "";
            return (
              <li
                key={p}
                className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-paper-2 px-2 py-1.5"
              >
                <span className="w-16 shrink-0 text-caption font-semibold">{p}</span>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => {
                    const isoNext = combineDateAndTime(
                      e.target.value,
                      timeStr || "12:00",
                    );
                    onChangeDraft(draft.id, (d) => ({
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
                    onChangeDraft(draft.id, (d) => ({
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
    </div>
  );
}

/**
 * Right schedule shelf — calendar first; multi accordion fully collapsible.
 */
export function StudioScheduleShelf({
  open,
  drafts,
  focusId,
  committedPosts,
  workspacePlatforms,
  busy,
  onClose,
  onFocus,
  onChangeDraft,
  onBestTimes,
  onCommit,
  onWidthChange,
}: {
  open: boolean;
  drafts: DraftPost[];
  focusId: string | null;
  committedPosts: ScheduledPost[];
  workspacePlatforms: Platform[];
  busy?: boolean;
  onClose: () => void;
  onFocus: (id: string) => void;
  onChangeDraft: (id: string, updater: (d: DraftPost) => DraftPost) => void;
  onBestTimes: () => void;
  onCommit: () => void;
  onWidthChange?: (w: number) => void;
}) {
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_W;
    const raw = window.localStorage.getItem(WIDTH_KEY);
    const n = raw ? Number(raw) : DEFAULT_W;
    return clampWidth(Number.isFinite(n) ? n : DEFAULT_W);
  });
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  /** Explicit open panels only — never forced by focus. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const draftsKey = drafts.map((d) => d.id).join(",");

  useEffect(() => {
    onWidthChange?.(open ? width : 0);
  }, [open, width, onWidthChange]);

  // New selection set → start fully collapsed (user expands as needed)
  useEffect(() => {
    setExpandedIds(new Set());
  }, [draftsKey]);

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
    setWidth(clampWidth(dragRef.current.startW + dx));
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
  const multi = drafts.length > 1;
  const allTimed = drafts.length > 0 && drafts.every(isScheduleTimed);
  const canCommit = drafts.length > 0 && allTimed;

  const bestTimesLabel =
    drafts.length <= 1
      ? "Best times for this reel"
      : `Best times for all ${drafts.length} reels`;

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    onFocus(id);
  }

  function expandAll() {
    setExpandedIds(new Set(drafts.map((d) => d.id)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  return (
    <aside
      data-testid="studio-schedule-shelf"
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex flex-col border-l border-line bg-card",
        "shadow-[-8px_0_24px_rgba(0,0,0,0.06)]",
        "transition-transform duration-[var(--motion-panel)] ease-[var(--ease-inout-lux)]",
        open ? "translate-x-0" : "pointer-events-none translate-x-full",
      )}
      style={{ width }}
      aria-hidden={!open}
    >
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

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pl-5 animate-fade-in">
        {drafts.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {drafts.map((d) => {
              const timed = isScheduleTimed(d);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onFocus(d.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors duration-150",
                      focus?.id === d.id
                        ? "border-foreground bg-secondary"
                        : "border-line bg-paper-2 hover:border-foreground/30",
                    )}
                  >
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-line">
                      <img
                        src={
                          d.previewUrl ||
                          demoPreviewForPost({ id: d.id, title: d.filename })
                        }
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0.5 right-0.5">
                        <TrafficLight
                          status={timed ? "SCHEDULED" : "IDLE"}
                          size="sm"
                        />
                      </span>
                    </span>
                    <span className="max-w-[7rem] truncate text-caption font-semibold">
                      {draftDisplayTitle(d)}
                    </span>
                    {timed ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

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

        {drafts.length === 1 && focus ? (
          <section className="space-y-3 rounded-lg border border-line p-3 animate-slide-in-up">
            <div className="flex items-center justify-between gap-2">
              <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Destinations & times
              </p>
              <span
                className={cn(
                  "shrink-0 text-xs font-semibold tabular-nums",
                  isScheduleTimed(focus)
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {timedProgressLabel(focus)}
              </span>
            </div>
            <DestTimesForDraft
              draft={focus}
              workspacePlatforms={workspacePlatforms}
              onChangeDraft={onChangeDraft}
            />
          </section>
        ) : null}

        {multi ? (
          <section className="space-y-2 animate-slide-in-up">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Destinations & times · per reel
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {drafts.filter(isScheduleTimed).length}/{drafts.length} ready
                </p>
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-xs font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline"
                >
                  Collapse all
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {drafts.map((d) => {
                const openPanel = expandedIds.has(d.id);
                const timed = isScheduleTimed(d);
                const whenLabel = timedProgressLabel(d);
                return (
                  <li
                    key={d.id}
                    className={cn(
                      "rounded-lg border transition-colors duration-150",
                      openPanel
                        ? "border-foreground/25 bg-card"
                        : "border-line bg-paper-2",
                      focus?.id === d.id && "ring-1 ring-foreground/15",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(d.id)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                    >
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-line">
                        <img
                          src={
                            d.previewUrl ||
                            demoPreviewForPost({ id: d.id, title: d.filename })
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {draftDisplayTitle(d)}
                          </span>
                          <TrafficLight
                            status={timed ? "SCHEDULED" : "IDLE"}
                            size="sm"
                          />
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {d.platforms.length > 0
                            ? d.platforms.join(" · ")
                            : "No destinations"}
                          {d.platforms.length > 0 ? " · " : ""}
                          {timed ? "queued" : "incomplete"}
                        </span>
                      </span>
                      {/* Queue when — top-right of row, left of chevron */}
                      <span
                        className={cn(
                          "max-w-[7.5rem] shrink-0 text-right text-[0.65rem] font-semibold tabular-nums leading-tight",
                          timed ? "text-foreground" : "text-muted-foreground",
                        )}
                        title={whenLabel}
                      >
                        {whenLabel}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150",
                          openPanel && "rotate-180",
                        )}
                      />
                    </button>
                    {openPanel ? (
                      <div className="border-t border-line px-3 py-3">
                        <DestTimesForDraft
                          draft={d}
                          workspacePlatforms={workspacePlatforms}
                          onChangeDraft={onChangeDraft}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-col gap-2 border-t border-line p-4 pl-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBestTimes}
            disabled={busy || drafts.length === 0}
            title={
              drafts.length > 1
                ? "Fills peak times for every reel in this schedule panel"
                : "Fills peak times for this reel"
            }
            className="btn-action btn-action-secondary min-h-10 flex-1 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {bestTimesLabel}
          </button>
          <button
            type="button"
            onClick={onCommit}
            disabled={!canCommit || busy}
            data-testid="shelf-schedule-commit"
            title={
              !allTimed && drafts.length > 0
                ? "Set destinations and times for every reel"
                : undefined
            }
            className="btn-action btn-action-primary min-h-10 flex-1 !text-white disabled:opacity-50"
          >
            Schedule {drafts.length > 1 ? `${drafts.length} reels` : "reel"}
          </button>
        </div>
        {drafts.length > 1 ? (
          <p className="text-center text-[0.65rem] text-muted-foreground">
            Best times applies to all {drafts.length} reels in this panel
          </p>
        ) : null}
      </footer>
    </aside>
  );
}
