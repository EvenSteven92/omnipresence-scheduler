import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import { CALENDAR_DOW, buildMonthGrid } from "@/lib/calendar-grid";
import { startOfWeek, buildWeekDays } from "@/lib/schedule-engine";
import {
  dayKeyFromDate,
  draftsOnDay,
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
 */
export function ProposedScheduleCalendar({
  drafts,
  highlightedIds,
  focusId,
  onFocusCard,
}: {
  drafts: DraftPost[];
  /** Selected shelf cards — visual emphasis */
  highlightedIds?: Set<string>;
  focusId?: string | null;
  onFocusCard?: (id: string) => void;
}) {
  const [mode, setMode] = useState<CalMode>("week");
  const [anchor, setAnchor] = useState(() => new Date());

  const weekStart = useMemo(() => startOfWeek(anchor, "sun"), [anchor]);
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  const monthCells = useMemo(
    () => buildMonthGrid(anchor.getFullYear(), anchor.getMonth()),
    [anchor],
  );

  const unscheduled = unscheduledDrafts(drafts);
  const withTimes = drafts.length - unscheduled.length;

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
            Cards appear once per day · platforms hidden ·{" "}
            {withTimes} timed
            {unscheduled.length > 0 ? ` · ${unscheduled.length} without times` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              dense={false}
              maxShow={3}
              highlightedIds={highlightedIds}
              focusId={focusId}
              onFocusCard={onFocusCard}
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
                dense
                muted={cell.muted}
                maxShow={2}
                highlightedIds={highlightedIds}
                focusId={focusId}
                onFocusCard={onFocusCard}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DayCell({
  date,
  drafts,
  dense,
  muted,
  maxShow,
  highlightedIds,
  focusId,
  onFocusCard,
}: {
  date: Date;
  drafts: DraftPost[];
  dense: boolean;
  muted?: boolean;
  maxShow: number;
  highlightedIds?: Set<string>;
  focusId?: string | null;
  onFocusCard?: (id: string) => void;
}) {
  const key = dayKeyFromDate(date);
  const isToday = dayKeyFromDate(new Date()) === key;
  const shown = drafts.slice(0, maxShow);
  const more = drafts.length - shown.length;

  return (
    <div
      className={cn(
        "min-h-[5.5rem] bg-card p-1.5",
        dense && "min-h-[4.5rem]",
        muted && "bg-paper-2/80 opacity-70",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold tabular-nums",
            isToday ? "bg-foreground text-white" : "text-foreground",
            muted && !isToday && "text-muted-foreground",
          )}
        >
          {date.getDate()}
        </span>
        {drafts.length > 0 ? (
          <span className="text-[0.6rem] font-medium tabular-nums text-muted-foreground">
            {drafts.length}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        {shown.map((draft) => {
          const hi = highlightedIds?.has(draft.id);
          const focused = focusId === draft.id;
          const earliest = earliestIsoOnDay(draft, key);
          return (
            <button
              key={draft.id}
              type="button"
              onClick={() => onFocusCard?.(draft.id)}
              title={draftDisplayTitle(draft)}
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
        {more > 0 ? (
          <span className="px-1 text-[0.6rem] font-medium text-muted-foreground">+{more} more</span>
        ) : null}
      </div>
    </div>
  );
}
