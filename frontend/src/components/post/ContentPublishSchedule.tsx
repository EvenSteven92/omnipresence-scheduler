import { CalendarClock } from "lucide-react";
import type { Platform, ScheduledPost } from "@/lib/mock-data";
import {
  buildPlatformSlots,
  formatScheduleTimeShort,
} from "@/lib/schedule-display";
import { PublishScheduleCalendar } from "@/components/post/PublishScheduleCalendar";
import { PublishTimeEditor } from "@/components/post/PublishTimeEditor";
import { PublishTimesAgenda } from "@/components/post/PublishTimesAgenda";

function PublishTimesHeader({ platformCount }: { platformCount: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
        <span className="text-title text-sm">Publish times</span>
      </div>
      <span className="text-body-sm text-muted-foreground">
        1 file · {platformCount} platform{platformCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}

/**
 * One content piece → many platform publishes. Surfaces where & when without
 * splitting into separate calendar rows per platform.
 */
export function ContentPublishSchedule({
  fileId = "view",
  platforms,
  proposedTimes,
  fallbackIso,
  variant = "panel",
  editable = false,
  onSuggestTimes,
  onApplyTimes,
  scheduledPosts,
  readOnlyCalendar = false,
}: {
  fileId?: string;
  platforms: Platform[];
  proposedTimes?: Partial<Record<Platform, string>>;
  fallbackIso?: string;
  variant?: "panel" | "compact";
  editable?: boolean;
  onSuggestTimes?: (times: Partial<Record<Platform, string>>) => void;
  onApplyTimes?: (times: Partial<Record<Platform, string>>) => void;
  scheduledPosts?: ScheduledPost[];
  /** When true, read-only panel uses month calendar instead of agenda. */
  readOnlyCalendar?: boolean;
}) {
  const slots = buildPlatformSlots(platforms, proposedTimes, fallbackIso);

  if (platforms.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Select at least one platform for this file.</p>
    );
  }

  if (variant === "compact") {
    if (slots.length === 0) {
      return <p className="text-[0.6rem] text-muted-foreground/70">No times set</p>;
    }
    const earliest = slots[0]!;
    const spread =
      slots.length > 1 && slots[slots.length - 1]!.iso !== earliest.iso
        ? `${formatScheduleTimeShort(earliest.iso)} → ${formatScheduleTimeShort(slots[slots.length - 1]!.iso)}`
        : formatScheduleTimeShort(earliest.iso);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-mono text-muted-foreground">
          {slots.length} publish{slots.length === 1 ? "" : "es"}
        </span>
        <span className="font-mono text-[0.65rem] text-foreground">{spread}</span>
      </div>
    );
  }

  if (editable) {
    return (
      <div className="overflow-hidden rounded-sm border border-border bg-background/40">
        <PublishTimesHeader platformCount={platforms.length} />
        <PublishTimeEditor
          fileId={fileId}
          platforms={platforms}
          proposedTimes={proposedTimes}
          onSuggestTimes={onSuggestTimes}
          onApplyTimes={onApplyTimes}
          scheduledPosts={scheduledPosts}
        />
      </div>
    );
  }

  if (readOnlyCalendar) {
    return (
      <div className="overflow-hidden rounded-sm border border-border bg-background/40">
        <PublishTimesHeader platformCount={platforms.length} />
        <PublishScheduleCalendar
          platforms={platforms}
          proposedTimes={proposedTimes}
          fallbackIso={fallbackIso}
          scheduledPosts={scheduledPosts}
        />
      </div>
    );
  }

  return (
    <PublishTimesAgenda
      platforms={platforms}
      platformTimes={proposedTimes}
      fallbackIso={fallbackIso ?? new Date().toISOString()}
      mode="scheduled"
    />
  );
}