import { ChevronLeft, ChevronRight } from "lucide-react";
import { isSameCalendarDay, today } from "@/lib/demo-clock";
import { buildWeekDays, calendarDayKey, startOfWeek } from "@/lib/schedule-engine";

const DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function PublishWeekPicker({
  weekStart,
  selectedDay,
  onWeekStartChange,
  onSelectDay,
  slotCountsByDay,
}: {
  weekStart: Date;
  selectedDay: Date;
  onWeekStartChange: (next: Date) => void;
  onSelectDay: (day: Date) => void;
  /** Day key (calendarDayKey) → number of slots on that day */
  slotCountsByDay?: Record<string, number>;
}) {
  const days = buildWeekDays(weekStart);
  const now = today();
  const label = `${days[0]!.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6]!.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div data-testid="publish-week-picker">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const prev = new Date(weekStart);
              prev.setDate(prev.getDate() - 7);
              onWeekStartChange(prev);
            }}
            aria-label="previous week"
            className="rounded-sm border border-border bg-surface p-1.5 text-foreground hover:bg-secondary"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="display-mono text-[0.65rem] uppercase tracking-[0.06em]">{label}</span>
          <button
            type="button"
            onClick={() => {
              const next = new Date(weekStart);
              next.setDate(next.getDate() + 7);
              onWeekStartChange(next);
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
            const current = startOfWeek(today());
            onWeekStartChange(current);
            onSelectDay(now);
          }}
          className="rounded-sm border border-border bg-surface px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map((day, idx) => {
          const isToday = isSameCalendarDay(day, now);
          const isSelected = isSameCalendarDay(day, selectedDay);
          const count = slotCountsByDay?.[calendarDayKey(day)] ?? 0;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              data-testid={`publish-week-day-${day.getDate()}`}
              className={`flex flex-col items-center gap-1 bg-surface px-1 py-3 transition-colors ${
                isSelected ? "ring-1 ring-inset ring-accent" : "hover:bg-secondary/40"
              }`}
            >
              <span className="label-mono text-[0.45rem] text-muted-foreground">{DOW[idx]}</span>
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-sm font-mono text-xs ${
                  isToday ? "bg-accent font-semibold text-accent-foreground" : "text-foreground"
                }`}
              >
                {day.getDate()}
              </span>
              {count > 0 ? (
                <span className="label-mono text-[0.4rem] text-accent">{count}</span>
              ) : (
                <span className="h-3" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
