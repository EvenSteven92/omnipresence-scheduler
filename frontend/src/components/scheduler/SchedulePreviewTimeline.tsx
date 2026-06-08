import { useMemo } from "react";
import type { BulkScheduleSlot } from "@/lib/schedule-engine";
import { formatScheduleTimeShort } from "@/lib/schedule-display";
import { PlatformChip } from "@/components/post/PlatformChip";

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function SchedulePreviewTimeline({ slots }: { slots: BulkScheduleSlot[] }) {
  const byDay = useMemo(() => {
    const map = new Map<string, BulkScheduleSlot[]>();
    slots.forEach((slot) => {
      const key = dayKey(slot.iso);
      const arr = map.get(key) ?? [];
      arr.push(slot);
      map.set(key, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => +new Date(a.iso) - +new Date(b.iso)));
    return [...map.entries()].sort((a, b) => +new Date(a[1][0]!.iso) - +new Date(b[1][0]!.iso));
  }, [slots]);

  if (slots.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs text-muted-foreground">
        Generate a preview to see your week fill up.
      </p>
    );
  }

  return (
    <div
      data-testid="schedule-preview-timeline"
      className="max-h-80 divide-y divide-border overflow-y-auto"
    >
      {byDay.map(([key, daySlots]) => (
        <div key={key} className="px-4 py-3">
          <div className="label-mono mb-2 text-[0.55rem] text-muted-foreground">
            {dayLabel(daySlots[0]!.iso)}
          </div>
          <ul className="space-y-2">
            {daySlots.map((slot) => (
              <li
                key={`${slot.fileId}-${slot.platform}-${slot.iso}`}
                className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-background/40 px-3 py-2"
              >
                <span className="max-w-[8rem] truncate font-mono text-[0.6rem] text-foreground">
                  {slot.filename}
                </span>
                <PlatformChip
                  platform={slot.platform}
                  label={formatScheduleTimeShort(slot.iso)}
                  size="xs"
                />
                <span className="font-mono text-[0.5rem] text-muted-foreground/80">{slot.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}