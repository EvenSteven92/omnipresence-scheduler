import { ChevronLeft, ChevronRight, X as XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import type { ScheduledPost } from "@/lib/mock-data";
import { CALENDAR_DOW, buildMonthGrid } from "@/lib/calendar-grid";
import { startOfWeek, buildWeekDays } from "@/lib/schedule-engine";
import {
  committedOnDay,
  dayKeyFromDate,
  draftsOnDay,
  earliestCommittedIsoOnDay,
  earliestIsoOnDay,
  unscheduledDrafts,
} from "@/lib/proposed-schedule-calendar";
import { demoPreviewForPost } from "@/lib/demo-media";
import { cn } from "@/lib/utils";

type CalMode = "week" | "month";

function formatTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Week/month preview of proposed publishes — card once per day (not per platform).
 * Multi-card days: sorted by earliest time; overflow opens a day panel with the full list.
 * Optional muted layer for already-committed scheduled posts.
 */
export function ProposedScheduleCalendar({
  drafts,
  committedPosts = [],
  highlightedIds,
  focusId,
  onFocusCard,
}: {
  drafts: DraftPost[];
  /** Already-scheduled posts shown as muted context (default layer ON). */
  committedPosts?: ScheduledPost[];
  /** Selected shelf cards — visual emphasis */
  highlightedIds?: Set<string>;
  focusId?: string | null;
  onFocusCard?: (id: string) => void;
}) {
  const [mode, setMode] = useState<CalMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [showExisting, setShowExisting] = useState(true);
  const [dayPanelDate, setDayPanelDate] = useState<Date | null>(null);

  const weekStart = useMemo(() => startOfWeek(anchor, "sun"), [anchor]);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const monthCells = useMemo(
    () => buildMonthGrid(anchor.getFullYear(), anchor.getMonth()),
    [anchor],
  );

  const unscheduled = unscheduledDrafts(drafts);
  const withTimes = drafts.length - unscheduled.length;
  const hasCommitted = committedPosts.some((p) => p.status !== "published");

  function shift(delta: number) {
    setAnchor((a) => {
      const d = new Date(a);
      if (mode === "week") d.setDate(d.getDate() + delta * 7);
      else d.setMonth(d.getMonth() + delta);
      return d;
    });
  }

  const headerLabel =
    mode === "week"
      ? `${weekDays[0]!.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekDays[6]!.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div
      data-testid="proposed-schedule-calendar"
      className="rounded-md border border-line bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Proposed schedule
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Cards once per day · multi-card days stack by time ·{" "}
            {withTimes} timed
            {unscheduled.length > 0 ? ` · ${unscheduled.length} without times` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasCommitted ? (
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2 py-1 text-caption text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={showExisting}
                onChange={(e) => setShowExisting(e.target.checked)}
                className="h-3 w-3 accent-foreground"
                data-testid="show-existing-schedule"
              />
              Show existing
            </label>
          ) : null}
          <div className="flex rounded-md border border-line p-0.5">
            {(["week", "month"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded px-2.5 py-1 text-caption font-medium capitalize transition-colors",
                  mode === m
                    ? "bg-foreground text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => shift(-1)}
            className="rounded-md border border-line p-1.5 hover:bg-secondary"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-foreground">
            {headerLabel}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            className="rounded-md border border-line p-1.5 hover:bg-secondary"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-md border border-line px-2 py-1 text-caption font-medium hover:bg-secondary"
          >
            Today
          </button>
        </div>
      </div>

      {mode === "week" ? (
        <div className="grid grid-cols-7 gap-px border-t-0 bg-line">
          {weekDays.map((day) => (
            <DayCell
              key={dayKeyFromDate(day)}
              date={day}
              drafts={draftsOnDay(drafts, day)}
              committed={
                showExisting ? committedOnDay(committedPosts, day) : []
              }
              dense={false}
              maxShow={3}
              highlightedIds={highlightedIds}
              focusId={focusId}
              onFocusCard={onFocusCard}
              onOpenDay={() => setDayPanelDate(day)}
            />
          ))}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-px border-b border-line bg-paper-2">
            {CALENDAR_DOW.map((d) => (
              <div
                key={d}
                className="px-1 py-2 text-center text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-line">
            {monthCells.map((cell) => (
              <DayCell
                key={cell.key + cell.date.toISOString()}
                date={cell.date}
                drafts={draftsOnDay(drafts, cell.date)}
                committed={
                  showExisting
                    ? committedOnDay(committedPosts, cell.date)
                    : []
                }
                dense
                muted={cell.muted}
                maxShow={2}
                highlightedIds={highlightedIds}
                focusId={focusId}
                onFocusCard={onFocusCard}
                onOpenDay={() => setDayPanelDate(cell.date)}
              />
            ))}
          </div>
        </div>
      )}

      {dayPanelDate ? (
        <DayCardsPanel
          date={dayPanelDate}
          drafts={draftsOnDay(drafts, dayPanelDate)}
          committed={
            showExisting ? committedOnDay(committedPosts, dayPanelDate) : []
          }
          highlightedIds={highlightedIds}
          focusId={focusId}
          onFocusCard={(id) => {
            onFocusCard?.(id);
            setDayPanelDate(null);
          }}
          onClose={() => setDayPanelDate(null)}
        />
      ) : null}
    </div>
  );
}

function DayCell({
  date,
  drafts,
  committed,
  dense,
  muted,
  maxShow,
  highlightedIds,
  focusId,
  onFocusCard,
  onOpenDay,
}: {
  date: Date;
  drafts: DraftPost[];
  committed: ScheduledPost[];
  dense: boolean;
  muted?: boolean;
  maxShow: number;
  highlightedIds?: Set<string>;
  focusId?: string | null;
  onFocusCard?: (id: string) => void;
  onOpenDay: () => void;
}) {
  const key = dayKeyFromDate(date);
  const isToday = dayKeyFromDate(new Date()) === key;
  const totalCount = drafts.length + committed.length;

  // Proposed first (sorted), then committed overflow budget after proposed chips
  const shownDrafts = drafts.slice(0, maxShow);
  const remainingSlots = Math.max(0, maxShow - shownDrafts.length);
  const shownCommitted = committed.slice(0, remainingSlots);
  const hidden =
    drafts.length - shownDrafts.length + (committed.length - shownCommitted.length);

  return (
    <div
      className={cn(
        "min-h-[5.5rem] bg-card p-1.5",
        dense && "min-h-[4.5rem]",
        muted && "bg-paper-2/80 opacity-70",
      )}
      data-testid={`cal-day-${key}`}
      data-card-count={totalCount}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onOpenDay}
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold tabular-nums transition-colors",
            isToday ? "bg-foreground text-white" : "text-foreground hover:bg-secondary",
            muted && !isToday && "text-muted-foreground",
          )}
          aria-label={`Open ${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })} — ${totalCount} card${totalCount === 1 ? "" : "s"}`}
        >
          {date.getDate()}
        </button>
        {totalCount > 0 ? (
          <button
            type="button"
            onClick={onOpenDay}
            className="text-[0.6rem] font-medium tabular-nums text-muted-foreground hover:text-foreground"
            aria-label={`${totalCount} cards this day`}
          >
            {totalCount}
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        {shownDrafts.map((draft) => {
          const hi = highlightedIds?.has(draft.id);
          const focused = focusId === draft.id;
          const earliest = earliestIsoOnDay(draft, key);
          return (
            <button
              key={draft.id}
              type="button"
              onClick={() => onFocusCard?.(draft.id)}
              title={draftDisplayTitle(draft)}
              data-testid={`cal-proposed-${draft.id}`}
              className={cn(
                "flex w-full items-center gap-1.5 rounded border px-1 py-0.5 text-left transition-colors",
                focused
                  ? "border-foreground bg-foreground text-white"
                  : hi
                    ? "border-foreground/40 bg-secondary"
                    : "border-line bg-paper-2 hover:border-foreground/30",
              )}
            >
              {!dense ? (
                <span className="h-6 w-6 shrink-0 overflow-hidden rounded border border-line/50 bg-background">
                  <img
                    src={
                      draft.previewUrl ||
                      demoPreviewForPost({ id: draft.id, title: draft.filename })
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-[0.65rem] font-semibold leading-tight",
                    focused ? "text-white" : "text-foreground",
                  )}
                >
                  {draftDisplayTitle(draft)}
                </span>
                {earliest && !dense ? (
                  <span
                    className={cn(
                      "block text-[0.55rem]",
                      focused ? "text-white/70" : "text-muted-foreground",
                    )}
                  >
                    from {formatTimeShort(earliest)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
        {shownCommitted.map((post) => {
          const earliest = earliestCommittedIsoOnDay(post, key);
          return (
            <div
              key={post.id}
              title={`${post.title} (scheduled)`}
              data-testid={`cal-committed-${post.id}`}
              className="flex w-full items-center gap-1.5 rounded border border-dashed border-line/80 bg-transparent px-1 py-0.5 opacity-60"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.65rem] font-medium leading-tight text-muted-foreground">
                  {post.title}
                </span>
                {earliest && !dense ? (
                  <span className="block text-[0.55rem] text-muted-foreground/80">
                    {formatTimeShort(earliest)} · live
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
        {hidden > 0 ? (
          <button
            type="button"
            onClick={onOpenDay}
            data-testid={`cal-day-more-${key}`}
            className="rounded px-1 py-0.5 text-left text-[0.6rem] font-semibold text-foreground underline-offset-2 hover:underline"
          >
            +{hidden} more
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Full multi-card day list — proposed (editable) + committed (context). */
function DayCardsPanel({
  date,
  drafts,
  committed,
  highlightedIds,
  focusId,
  onFocusCard,
  onClose,
}: {
  date: Date;
  drafts: DraftPost[];
  committed: ScheduledPost[];
  highlightedIds?: Set<string>;
  focusId?: string | null;
  onFocusCard?: (id: string) => void;
  onClose: () => void;
}) {
  const key = dayKeyFromDate(date);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const total = drafts.length + committed.length;

  return (
    <div
      onClick={onClose}
      data-testid="proposed-day-panel"
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-foreground bg-background shadow-[var(--shadow-card)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
              This day
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{dateLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {total === 0
                ? "No cards"
                : `${drafts.length} proposed${committed.length > 0 ? ` · ${committed.length} already scheduled` : ""} · sorted by time`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-sm border border-line bg-background p-1.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {total === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nothing on this day yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {drafts.map((draft, index) => {
                const earliest = earliestIsoOnDay(draft, key);
                const focused = focusId === draft.id;
                const hi = highlightedIds?.has(draft.id);
                return (
                  <li key={draft.id}>
                    <button
                      type="button"
                      onClick={() => onFocusCard?.(draft.id)}
                      data-testid={`day-panel-proposed-${draft.id}`}
                      className={cn(
                        "flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors",
                        focused
                          ? "bg-foreground text-white"
                          : hi
                            ? "bg-secondary hover:bg-secondary/80"
                            : "hover:bg-paper-2",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold tabular-nums",
                          focused
                            ? "bg-white/15 text-white"
                            : "bg-paper-2 text-muted-foreground",
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-line/50 bg-background">
                        <img
                          src={
                            draft.previewUrl ||
                            demoPreviewForPost({
                              id: draft.id,
                              title: draft.filename,
                            })
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-semibold",
                            focused ? "text-white" : "text-foreground",
                          )}
                        >
                          {draftDisplayTitle(draft)}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block text-xs",
                            focused ? "text-white/70" : "text-muted-foreground",
                          )}
                        >
                          {earliest
                            ? `from ${formatTimeShort(earliest)} · proposed`
                            : "Proposed"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {committed.map((post, index) => {
                const earliest = earliestCommittedIsoOnDay(post, key);
                return (
                  <li key={post.id}>
                    <div
                      data-testid={`day-panel-committed-${post.id}`}
                      className="flex w-full items-center gap-3 px-5 py-3.5 opacity-70"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-2 text-[0.65rem] font-semibold tabular-nums text-muted-foreground">
                        {drafts.length + index + 1}
                      </span>
                      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-dashed border-line bg-paper-2">
                        <img
                          src={
                            post.previewUrl ||
                            demoPreviewForPost({ id: post.id, title: post.title })
                          }
                          alt=""
                          className="h-full w-full object-cover opacity-80"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-muted-foreground">
                          {post.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {earliest
                            ? `${formatTimeShort(earliest)} · already scheduled`
                            : "Already scheduled"}
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
