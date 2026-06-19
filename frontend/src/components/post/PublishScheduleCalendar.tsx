import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Platform, ScheduledPost } from "@/lib/mock-data";
import { isSameCalendarDay, today, todayStart } from "@/lib/demo-clock";
import { buildMonthWeeks, CALENDAR_DOW, monthStartFromDate } from "@/lib/calendar-grid";
import {
  buildPlatformSlots,
  formatScheduleTimeShort,
  type PlatformSlot,
} from "@/lib/schedule-display";
import { contentCardAnchorDate, groupContentCardsByDay } from "@/lib/scheduled-post-display";
import { PlatformChip } from "@/components/post/PlatformChip";
import { CalendarDayPostContent } from "@/components/post/CalendarDayPostContent";
import { mergeWorkspaceEvents, useCustomEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { CalendarPostModals } from "@/components/post/CalendarPostModals";
import { useCalendarPostSelection } from "@/hooks/useCalendarPostSelection";
import { useWorkspace } from "@/lib/workspace-context";

function groupSlotsByDay(
  slots: PlatformSlot[],
  year: number,
  month: number,
): Map<number, PlatformSlot[]> {
  const map = new Map<number, PlatformSlot[]>();
  slots.forEach((slot) => {
    const dt = new Date(slot.iso);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate();
      const arr = map.get(day) ?? [];
      arr.push(slot);
      map.set(day, arr);
    }
  });
  map.forEach((arr) => arr.sort((a, b) => +new Date(a.iso) - +new Date(b.iso)));
  return map;
}

function futureScheduledPosts(posts: ScheduledPost[]): ScheduledPost[] {
  const start = todayStart().getTime();
  return posts.filter((p) => contentCardAnchorDate(p).getTime() >= start);
}

function initialViewMonth(slots: PlatformSlot[], scheduled: ScheduledPost[]): Date {
  const candidates = [
    ...slots.map((s) => new Date(s.iso)),
    ...scheduled.map((p) => contentCardAnchorDate(p)),
  ].sort((a, b) => +a - +b);
  if (candidates.length === 0) return monthStartFromDate(today());
  return monthStartFromDate(candidates[0]!);
}

function Legend({
  swatch,
  label,
  dashed = false,
}: {
  swatch: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
      <span
        className={`inline-block h-2 w-2 rounded-sm ${swatch} ${dashed ? "border border-dashed border-muted-foreground/50 bg-transparent" : ""}`}
      />
      {label}
    </span>
  );
}

/**
 * Compact month grid for per-platform publish times — same visual language as Calendar.
 * Shows workspace scheduled posts so open dates are visible while picking times.
 */
export function PublishScheduleCalendar({
  platforms,
  proposedTimes,
  fallbackIso,
  scheduledPosts = [],
}: {
  platforms: Platform[];
  proposedTimes?: Partial<Record<Platform, string>>;
  fallbackIso?: string;
  scheduledPosts?: ScheduledPost[];
}) {
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );
  const { resolveEventId } = useEventAssociations(workspaceId);
  const slots = buildPlatformSlots(platforms, proposedTimes, fallbackIso);
  const scheduled = useMemo(() => futureScheduledPosts(scheduledPosts), [scheduledPosts]);

  const [viewMonth, setViewMonth] = useState(() => initialViewMonth(slots, scheduled));
  const [selectedDay, setSelectedDay] = useState<number | null>(() => today().getDate());
  const { dayGrid, detailPost, openPosts, selectFromGrid, closeDayGrid, closeDetail } =
    useCalendarPostSelection();

  const focusYear = viewMonth.getFullYear();
  const focusMonth = viewMonth.getMonth();
  const now = today();

  const weeks = useMemo(() => buildMonthWeeks(focusYear, focusMonth), [focusYear, focusMonth]);
  const byDay = useMemo(
    () => groupSlotsByDay(slots, focusYear, focusMonth),
    [slots, focusYear, focusMonth],
  );
  const scheduledByDay = useMemo(
    () => groupContentCardsByDay(scheduled, focusYear, focusMonth),
    [scheduled, focusYear, focusMonth],
  );

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const unsetCount = platforms.length - slots.length;
  const scheduledInMonth = useMemo(() => {
    let n = 0;
    scheduledByDay.forEach((arr) => {
      n += arr.length;
    });
    return n;
  }, [scheduledByDay]);

  function shiftMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function jumpToday() {
    const current = today();
    setViewMonth(monthStartFromDate(current));
    setSelectedDay(current.getDate());
  }

  return (
    <div data-testid="publish-schedule-calendar">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            data-testid="publish-cal-prev-month"
            aria-label="previous month"
            className="rounded-sm border border-border bg-surface p-1.5 text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="display-mono text-xs uppercase tracking-[0.06em]">{monthLabel}</span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            data-testid="publish-cal-next-month"
            aria-label="next month"
            className="rounded-sm border border-border bg-surface p-1.5 text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={jumpToday}
            data-testid="publish-cal-today"
            className="rounded-sm border border-border bg-surface px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Today
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Legend swatch="bg-accent" label="today" />
          <Legend swatch="" label="scheduled" dashed />
          <Legend swatch="bg-foreground" label="this_post" />
        </div>
      </div>

      <p className="border-b border-border px-4 py-2.5 text-[0.6rem] text-muted-foreground">
        {scheduledInMonth > 0
          ? `${scheduledInMonth} scheduled card${scheduledInMonth === 1 ? "" : "s"} this month`
          : "No other scheduled cards this month"}
        {slots.length > 0
          ? ` · ${slots.length} publish time${slots.length === 1 ? "" : "s"} for this file`
          : unsetCount > 0
            ? ` · ${unsetCount} platform${unsetCount === 1 ? "" : "s"} still need a time`
            : ""}
      </p>

      <div className="overflow-hidden bg-border">
        <div className="grid grid-cols-[2rem_repeat(7,1fr)] gap-px">
          <div className="bg-surface py-1.5 text-center label-mono text-[0.45rem] text-muted-foreground">
            wk
          </div>
          {CALENDAR_DOW.map((d) => (
            <div key={d} className="bg-surface py-1.5 text-center label-mono text-[0.5rem]">
              {d}
            </div>
          ))}
          {weeks.map((week) => (
            <div key={`week-${week.weekNumber}-${week.cells[0]!.key}`} className="contents">
              <div className="flex min-h-[5.5rem] items-start justify-center bg-surface px-0.5 py-1.5">
                <span className="font-mono text-[0.5rem] tabular-nums text-muted-foreground">
                  {week.weekNumber}
                </span>
              </div>
              {week.cells.map((c) => {
                const daySlots = !c.muted ? byDay.get(c.d) : undefined;
                const dayScheduled = !c.muted ? scheduledByDay.get(c.d) : undefined;
                const itemCount = (daySlots?.length ?? 0) + (dayScheduled?.length ?? 0);
                const isToday = isSameCalendarDay(c.date, now);
                const isSelected = !c.muted && c.d === selectedDay;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => !c.muted && setSelectedDay(c.d)}
                    data-testid={c.muted ? undefined : `publish-cal-day-${c.d}`}
                    className={`group relative flex min-h-[5.5rem] flex-col gap-0.5 bg-surface p-1.5 text-left transition-colors ${
                      c.muted
                        ? "text-muted-foreground/40"
                        : isSelected
                          ? "ring-1 ring-inset ring-accent"
                          : "hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-0.5">
                      <span
                        className={`inline-flex h-4 min-w-4 items-center justify-center rounded-sm px-0.5 text-[0.55rem] font-mono ${
                          isToday
                            ? "bg-accent font-semibold text-accent-foreground"
                            : c.muted
                              ? "text-muted-foreground/40"
                              : "text-foreground"
                        }`}
                      >
                        {c.d}
                      </span>
                      {itemCount > 0 && (
                        <span className="label-mono text-[0.45rem] text-muted-foreground/70">
                          {itemCount}
                        </span>
                      )}
                    </div>
                    {(dayScheduled || daySlots) && (
                      <div
                        className={`min-h-0 flex-1 flex-col gap-0.5 ${
                          itemCount > 3 ? "flex overflow-y-auto pr-0.5" : "flex"
                        }`}
                      >
                        {dayScheduled && dayScheduled.length > 0 ? (
                          <CalendarDayPostContent
                            posts={dayScheduled}
                            date={c.date}
                            onOpenPosts={openPosts}
                            dense
                            variant="scheduled"
                          />
                        ) : null}
                        {daySlots?.map((slot) => (
                          <PlatformChip
                            key={`${slot.platform}-${slot.iso}`}
                            platform={slot.platform}
                            label={formatScheduleTimeShort(slot.iso)}
                            size="xs"
                            title={`${slot.platform} · ${slot.at}`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <CalendarPostModals
        dayGrid={dayGrid}
        detailPost={detailPost}
        events={events}
        resolveEventId={resolveEventId}
        onCloseDayGrid={closeDayGrid}
        onCloseDetail={closeDetail}
        onSelectFromGrid={selectFromGrid}
      />
    </div>
  );
}
