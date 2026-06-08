import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Sparkles } from "lucide-react";
import type { Platform, ScheduledPost } from "@/lib/mock-data";
import { today } from "@/lib/demo-clock";
import { buildPlatformSlots } from "@/lib/schedule-display";
import {
  calendarDayKey,
  combineDateAndTime,
  displayedSlotForPlatform,
  suggestTimesForDay,
  startOfWeek,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/schedule-engine";
import { PublishWeekPicker } from "@/components/post/PublishWeekPicker";
import {
  PlatformTimeEditor,
  type PlatformTimeDraft,
} from "@/components/post/PlatformTimeEditor";

function buildDrafts(
  platforms: Platform[],
  selectedDay: Date,
  proposedTimes?: Partial<Record<Platform, string>>,
): Partial<Record<Platform, PlatformTimeDraft>> {
  const out: Partial<Record<Platform, PlatformTimeDraft>> = {};
  platforms.forEach((platform) => {
    const committed = proposedTimes?.[platform];
    if (committed) {
      out[platform] = {
        date: toDateInputValue(new Date(committed)),
        time: toTimeInputValue(committed),
      };
      return;
    }
    const slot = displayedSlotForPlatform(platform, selectedDay, undefined);
    out[platform] = {
      date: toDateInputValue(selectedDay),
      time: slot.timeValue,
    };
  });
  return out;
}

export function PublishTimeEditor({
  fileId,
  platforms,
  proposedTimes,
  onSuggestTimes,
  onApplyTimes,
  scheduledPosts = [],
}: {
  fileId: string;
  platforms: Platform[];
  proposedTimes?: Partial<Record<Platform, string>>;
  onSuggestTimes?: (times: Partial<Record<Platform, string>>) => void;
  onApplyTimes?: (times: Partial<Record<Platform, string>>) => void;
  scheduledPosts?: ScheduledPost[];
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today()));
  const [selectedDay, setSelectedDay] = useState(() => today());
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<Platform, PlatformTimeDraft>>>(() =>
    buildDrafts(platforms, today(), proposedTimes),
  );

  const slots = buildPlatformSlots(platforms, proposedTimes);
  const unsetCount = platforms.length - slots.length;

  const proposedKey = useMemo(
    () => JSON.stringify(proposedTimes ?? {}),
    [proposedTimes],
  );

  // Re-sync when platforms change or times are committed — not on every day pick (handleSelectDay owns that).
  useEffect(() => {
    setDrafts(buildDrafts(platforms, selectedDay, proposedTimes));
    // selectedDay read for initial build only; day changes go through handleSelectDay
    // eslint-disable-next-line react-hooks/exhaustive-deps -- proposedKey tracks proposedTimes
  }, [platforms, proposedKey]);

  function handleSelectDay(day: Date) {
    setSelectedDay(day);
    setDrafts((cur) => {
      const next = { ...cur };
      platforms.forEach((platform) => {
        const committed = proposedTimes?.[platform];
        next[platform] = {
          date: toDateInputValue(day),
          time:
            cur[platform]?.time ??
            (committed
              ? toTimeInputValue(committed)
              : displayedSlotForPlatform(platform, day, undefined).timeValue),
        };
      });
      return next;
    });
  }

  function applySetTimes() {
    const times: Partial<Record<Platform, string>> = {};
    platforms.forEach((platform) => {
      const draft = drafts[platform];
      if (!draft) return;
      times[platform] = combineDateAndTime(draft.date, draft.time);
    });
    onApplyTimes?.(times);
  }

  async function runSuggest() {
    setBusy(true);
    try {
      const times = suggestTimesForDay(
        { id: fileId, platforms },
        selectedDay,
        scheduledPosts,
      );
      onSuggestTimes?.(times);
    } finally {
      setBusy(false);
    }
  }

  const slotCountsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    slots.forEach((slot) => {
      const key = calendarDayKey(new Date(slot.iso));
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [slots]);

  return (
    <div data-testid="publish-time-editor" className="overflow-hidden rounded-sm border border-border bg-background/40">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <span className="label-mono text-muted-foreground">pick_a_day</span>
        <div className="flex items-center gap-2">
          {onSuggestTimes ? (
            <button
              type="button"
              onClick={runSuggest}
              disabled={busy || platforms.length === 0}
              data-testid="suggest-times-btn"
              className="flex items-center gap-1.5 rounded-sm border border-accent/50 bg-accent/10 px-2.5 py-1.5 text-[0.55rem] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <Sparkles className="h-2.5 w-2.5" />
              )}
              Suggest_times
            </button>
          ) : null}
          <span className="label-mono text-[0.55rem] text-muted-foreground/80">
            {slots.length}/{platforms.length} set
            {unsetCount > 0 ? ` · ${unsetCount} need time` : ""}
          </span>
        </div>
      </div>

      <PublishWeekPicker
        weekStart={weekStart}
        selectedDay={selectedDay}
        onWeekStartChange={setWeekStart}
        onSelectDay={handleSelectDay}
        slotCountsByDay={slotCountsByDay}
      />

      <PlatformTimeEditor
        platforms={platforms}
        drafts={drafts}
        proposedTimes={proposedTimes}
        onDraftChange={(platform, draft) => {
          setDrafts((cur) => ({ ...cur, [platform]: draft }));
        }}
      />

      <div className="border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={applySetTimes}
          disabled={platforms.length === 0}
          data-testid="set-times-btn"
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-accent bg-accent px-4 py-2.5 text-[0.6rem] uppercase tracking-[0.14em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <CalendarClock className="h-3 w-3" strokeWidth={1.75} />
          Set_times
        </button>
        <p className="mt-2 text-center text-[0.6rem] leading-relaxed text-muted-foreground">
          Adjust times above, then press Set_times to save all platforms at once.
        </p>
      </div>
    </div>
  );
}