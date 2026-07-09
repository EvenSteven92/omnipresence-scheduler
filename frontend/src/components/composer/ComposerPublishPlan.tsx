import { CalendarDays, Clock, Sparkles } from "lucide-react";
import type { DraftPost } from "@/lib/composer-draft";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import type { Platform } from "@/lib/mock-data";
import { platformDotColor } from "@/lib/card-display";
import {
  displayedSlotForPlatform,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/schedule-engine";
import { today } from "@/lib/demo-clock";
import { cn } from "@/lib/utils";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Right rail — where & when this atomic card will publish.
 * Per-platform schedule is the source of truth for the card.
 */
export function ComposerPublishPlan({
  draft,
  scheduleReasons,
  onUpdateTime,
  onSuggestTimes,
  suggestBusy,
}: {
  draft: DraftPost;
  scheduleReasons?: Partial<Record<string, string>>;
  onUpdateTime: (platform: Platform, dateStr: string, timeStr: string) => void;
  onSuggestTimes: () => void;
  suggestBusy?: boolean;
}) {
  return (
    <div data-testid="composer-publish-plan" className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="page-kicker">Publish plan</p>
          <h3 className="mt-1 font-display text-base font-bold text-foreground">
            When & where
          </h3>
          <p className="mt-0.5 text-caption text-muted-foreground">
            One card · one publish time per platform
          </p>
        </div>
        <button
          type="button"
          onClick={onSuggestTimes}
          disabled={suggestBusy || draft.platforms.length === 0}
          data-testid="suggest-times-btn"
          className="btn-action btn-action-secondary min-h-9 gap-1.5 px-2.5 py-1.5 text-caption disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Best times
        </button>
      </div>

      {draft.platforms.length === 0 ? (
        <p className="rounded-md border border-foreground/40 bg-paper-2 px-3 py-4 text-body-sm text-muted-foreground">
          Select platforms in the editor to plan publishes.
        </p>
      ) : (
        <ul className="space-y-2">
          {draft.platforms.map((platform) => {
            const meta = PLATFORMS_BY_SHORT[platform];
            const committed = draft.proposedTimes?.[platform];
            const displayed = displayedSlotForPlatform(platform, today(), undefined);
            const slot = committed
              ? {
                  dateValue: toDateInputValue(new Date(committed)),
                  timeValue: toTimeInputValue(committed),
                  iso: committed,
                }
              : displayed;
            const reason = scheduleReasons?.[platform];

            return (
              <li
                key={platform}
                data-testid={`publish-plan-${platform.replace(/\s+/g, "-")}`}
                className="rounded-md border border-foreground bg-card p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-foreground"
                    style={{ background: platformDotColor(platform) }}
                  />
                  <span className="font-display text-sm font-bold text-foreground">
                    {meta?.full ?? platform}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-foreground bg-paper-2 px-2.5 py-1.5 text-caption font-semibold text-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatWhen(slot.iso).split(",").slice(0, 2).join(",")}
                    <input
                      type="date"
                      value={slot.dateValue}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        onUpdateTime(platform, e.target.value, slot.timeValue);
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                  <label className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-foreground bg-paper-2 px-2.5 py-1.5 text-caption font-semibold text-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(slot.iso).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    <input
                      type="time"
                      value={slot.timeValue}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        onUpdateTime(platform, slot.dateValue, e.target.value);
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>

                {reason ? (
                  <p className="mt-2 text-caption leading-snug text-muted-foreground">{reason}</p>
                ) : committed ? (
                  <p className="mt-2 text-caption text-muted-foreground">
                    Scheduled · {formatWhen(committed)}
                  </p>
                ) : (
                  <p className={cn("mt-2 text-caption text-warning")}>
                    Pick a time or run Best times
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-caption leading-relaxed text-muted-foreground">
        After schedule, this card appears on the calendar on each platform&apos;s date — open the day
        panel to see where it posts.
      </p>
    </div>
  );
}
