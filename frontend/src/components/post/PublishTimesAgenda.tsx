import type { Platform } from "@/lib/mock-data";
import { buildPlatformSlots, formatScheduleTimeShort } from "@/lib/schedule-display";
import { PlatformChip } from "@/components/post/PlatformChip";
import { CalendarClock, History } from "lucide-react";

export type PublishTimesAgendaMode = "published" | "scheduled";

const MODE_META: Record<
  PublishTimesAgendaMode,
  {
    icon: typeof History;
    iconClass: string;
    label: string;
    empty: string;
    testId: string;
    rowTestId: string;
  }
> = {
  published: {
    icon: History,
    iconClass: "text-success",
    label: "publish_history",
    empty: "No publish history recorded for this file.",
    testId: "publish-history-agenda",
    rowTestId: "publish-history-row",
  },
  scheduled: {
    icon: CalendarClock,
    iconClass: "text-accent",
    label: "scheduled_publishes",
    empty: "No publish times set for this file.",
    testId: "publish-schedule-agenda",
    rowTestId: "publish-schedule-row",
  },
};

/**
 * Scrollable agenda of per-platform publish times — used when viewing
 * scheduled or published content. Calendar is reserved for the composer.
 */
export function PublishTimesAgenda({
  platforms,
  platformTimes,
  fallbackIso,
  mode = "published",
}: {
  platforms: Platform[];
  platformTimes?: Partial<Record<Platform, string>>;
  fallbackIso: string;
  mode?: PublishTimesAgendaMode;
}) {
  const slots = buildPlatformSlots(platforms, platformTimes, fallbackIso);
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  if (slots.length === 0) {
    return <p className="text-xs text-muted-foreground">{meta.empty}</p>;
  }

  return (
    <div
      data-testid={meta.testId}
      className="overflow-hidden rounded-sm border border-border bg-background/40"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${meta.iconClass}`} strokeWidth={1.75} />
          <span className="text-body-sm font-medium text-foreground">{meta.label}</span>
        </div>
        <span className="label-mono text-muted-foreground/80">
          {slots.length} publish{slots.length === 1 ? "" : "es"}
        </span>
      </div>

      <div className="max-h-64 divide-y divide-border overflow-y-auto">
        {slots.map((slot) => {
          const dt = new Date(slot.iso);
          const month = dt.toLocaleDateString(undefined, { month: "short" }).toLowerCase();
          const weekday = dt.toLocaleDateString(undefined, { weekday: "short" }).toLowerCase();

          return (
            <div
              key={`${slot.platform}-${slot.iso}`}
              data-testid={`${meta.rowTestId}-${slot.platform.replace(/\s+/g, "-")}`}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="w-12 shrink-0 text-center">
                <div className="font-mono text-base font-semibold leading-none text-foreground">
                  {dt.getDate()}
                </div>
                <div className="label-mono mt-1 text-[0.45rem] text-muted-foreground/70">
                  {month}
                </div>
                <div className="label-mono mt-0.5 text-[0.4rem] text-muted-foreground/50">
                  {weekday}
                </div>
              </div>

              <PlatformChip platform={slot.platform} label={slot.platform} size="sm" />

              <div className="ml-auto min-w-0 text-right">
                <div className="font-mono text-xs text-foreground">
                  {formatScheduleTimeShort(slot.iso)}
                </div>
                <div className="label-mono mt-0.5 text-[0.45rem] text-muted-foreground/60">
                  {dt.getFullYear()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
