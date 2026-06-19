import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import type { DraftPost } from "@/components/post/ComposerCard";
import type { ScheduledPost } from "@/lib/mock-data";
import { isSameCalendarDay, today } from "@/lib/demo-clock";
import { formatScheduleTimeShort } from "@/lib/schedule-display";
import { contentCardAnchorDate } from "@/lib/scheduled-post-display";
import {
  buildWeekDays,
  calendarDayKey,
  pendingSlotsFromQueue,
  slotCountsForWeek,
  startOfWeek,
  type BulkScheduleSlot,
} from "@/lib/schedule-engine";
import { PlatformChip } from "@/components/post/PlatformChip";

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function scheduledCardsOnDay(posts: ScheduledPost[], day: Date): number {
  return posts.filter((p) => isSameCalendarDay(contentCardAnchorDate(p), day)).length;
}

export function ScheduleWeekPanel({
  queue,
  scheduledPosts = [],
  activeFileId,
  readyCount,
  onSelectFile,
  onApply,
}: {
  queue: DraftPost[];
  scheduledPosts?: ScheduledPost[];
  activeFileId?: string | null;
  readyCount: number;
  onSelectFile?: (fileId: string) => void;
  onApply: () => void;
}) {
  const pendingSlots = useMemo(() => pendingSlotsFromQueue(queue), [queue]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today()));
  const [focusDay, setFocusDay] = useState<Date | null>(null);

  const days = buildWeekDays(weekStart);
  const pendingCounts = useMemo(
    () => slotCountsForWeek(pendingSlots, weekStart),
    [pendingSlots, weekStart],
  );
  const now = today();

  const weekLabel = `${days[0]!.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6]!.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const visibleSlots = useMemo(() => {
    if (!focusDay) {
      return pendingSlots.filter((slot) => {
        const key = calendarDayKey(new Date(slot.iso));
        return days.some((d) => calendarDayKey(d) === key);
      });
    }
    return pendingSlots.filter((slot) => isSameCalendarDay(new Date(slot.iso), focusDay));
  }, [pendingSlots, focusDay, days]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, BulkScheduleSlot[]>();
    visibleSlots.forEach((slot) => {
      const key = calendarDayKey(new Date(slot.iso));
      const arr = map.get(key) ?? [];
      arr.push(slot);
      map.set(key, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => +new Date(a.iso) - +new Date(b.iso)));
    return [...map.entries()].sort((a, b) => +new Date(a[1][0]!.iso) - +new Date(b[1][0]!.iso));
  }, [visibleSlots]);

  return (
    <aside
      data-testid="schedule-week-panel"
      className="flex h-full w-[300px] shrink-0 flex-col border-l border-border bg-surface"
    >
      <div className="border-b border-border px-4 py-4">
        <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Week preview
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {pendingSlots.length > 0
            ? `${pendingSlots.length} pending publish${pendingSlots.length === 1 ? "" : "es"}`
            : queue.length === 0
              ? "Your week at a glance — pending slots appear as you schedule"
              : "Set times on your posts to fill the week"}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const prev = new Date(weekStart);
              prev.setDate(prev.getDate() - 7);
              setWeekStart(prev);
              setFocusDay(null);
            }}
            aria-label="previous week"
            className="rounded-sm border border-border bg-surface p-1.5 text-foreground hover:bg-secondary"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="display-mono text-[0.6rem] uppercase tracking-[0.06em]">
            {weekLabel}
          </span>
          <button
            type="button"
            onClick={() => {
              const next = new Date(weekStart);
              next.setDate(next.getDate() + 7);
              setWeekStart(next);
              setFocusDay(null);
            }}
            aria-label="next week"
            className="rounded-sm border border-border bg-surface p-1.5 text-foreground hover:bg-secondary"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setWeekStart(startOfWeek(today()));
            setFocusDay(today());
          }}
          className="rounded-sm border border-border px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px border-b border-border bg-border px-4 py-3">
        {days.map((day, idx) => {
          const key = calendarDayKey(day);
          const pending = pendingCounts[key] ?? 0;
          const scheduled = scheduledCardsOnDay(scheduledPosts, day);
          const isToday = isSameCalendarDay(day, now);
          const isFocus = focusDay ? isSameCalendarDay(day, focusDay) : false;
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                setFocusDay((cur) => (cur && isSameCalendarDay(cur, day) ? null : day))
              }
              data-testid={`pending-week-day-${day.getDate()}`}
              className={`flex flex-col items-center gap-1 bg-surface py-2 transition-colors ${
                isFocus ? "ring-1 ring-inset ring-accent" : "hover:bg-secondary/40"
              }`}
            >
              <span className="label-mono text-[0.45rem] text-muted-foreground">{DOW[idx]}</span>
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-sm font-mono text-[0.6rem] ${
                  isToday ? "bg-accent font-semibold text-accent-foreground" : "text-foreground"
                }`}
              >
                {day.getDate()}
              </span>
              {pending > 0 ? (
                <span className="font-mono text-[0.45rem] font-semibold text-accent">
                  {pending}
                </span>
              ) : scheduled > 0 ? (
                <span className="font-mono text-[0.45rem] text-muted-foreground/60">
                  {scheduled}
                </span>
              ) : (
                <span className="h-2.5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <span className="flex items-center gap-1.5 font-mono text-[0.5rem] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-sm bg-accent" />
          pending
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[0.5rem] text-muted-foreground/70">
          <span className="inline-block h-2 w-2 rounded-sm border border-muted-foreground/50" />
          on_calendar
        </span>
        {focusDay ? (
          <button
            type="button"
            onClick={() => setFocusDay(null)}
            className="ml-auto font-mono text-[0.5rem] text-accent hover:underline"
          >
            show_all
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {slotsByDay.length === 0 ? (
          <p className="py-6 text-center text-xs leading-relaxed text-muted-foreground">
            {queue.length === 0
              ? "Drop files to start — your pending publishes will show up here."
              : pendingSlots.length === 0
                ? "Set times on each post, then apply your schedule here."
                : "No pending publishes this week — try another week."}
          </p>
        ) : (
          <ul className="space-y-3">
            {slotsByDay.map(([key, daySlots]) => (
              <li key={key}>
                <div className="label-mono mb-1.5 text-[0.55rem] text-muted-foreground">
                  {new Date(daySlots[0]!.iso).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <ul className="space-y-1.5">
                  {daySlots.map((slot) => (
                    <li key={`${slot.fileId}-${slot.platform}-${slot.iso}`}>
                      <button
                        type="button"
                        onClick={() => onSelectFile?.(slot.fileId)}
                        className={`flex w-full flex-wrap items-center gap-1.5 rounded-sm border px-2.5 py-2 text-left transition-colors ${
                          slot.fileId === activeFileId
                            ? "border-accent/60 bg-accent/10"
                            : "border-border bg-background/40 hover:bg-secondary/40"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate font-mono text-[0.6rem] text-foreground">
                          {slot.filename}
                        </span>
                        <PlatformChip
                          platform={slot.platform}
                          label={formatScheduleTimeShort(slot.iso)}
                          size="xs"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-4">
        <button
          type="button"
          onClick={onApply}
          disabled={readyCount === 0}
          data-testid="apply-schedule-btn"
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-accent bg-accent px-4 py-3 text-[0.65rem] uppercase tracking-[0.14em] text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
          Apply_schedule
          {readyCount > 0 ? ` (${readyCount})` : ""}
        </button>
        <p className="mt-2 text-center text-[0.6rem] leading-relaxed text-muted-foreground">
          {readyCount > 0
            ? `Adds ${readyCount} content card${readyCount === 1 ? "" : "s"} to your calendar.`
            : queue.length === 0
              ? "Upload content and set publish times to enable."
              : "Each post needs a time on every selected platform."}
        </p>
      </div>
    </aside>
  );
}
