import { Sparkles } from "lucide-react";
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
import { ComposerCadenceBar } from "@/components/composer/ComposerCadenceBar";
import type { CadencePresetId } from "@/lib/schedule-engine";

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
 * Sticky when & where — cadence first, fine-tune second.
 */
export function ComposerPublishPlan({
  draft,
  scheduleReasons,
  onUpdateTime,
  onSuggestTimes,
  onCadence,
  cadenceActive,
  suggestBusy,
}: {
  draft: DraftPost;
  scheduleReasons?: Partial<Record<string, string>>;
  onUpdateTime: (platform: Platform, dateStr: string, timeStr: string) => void;
  onSuggestTimes: () => void;
  onCadence?: (id: CadencePresetId) => void;
  cadenceActive?: CadencePresetId | null;
  suggestBusy?: boolean;
}) {
  return (
    <div data-testid="composer-publish-plan" className="space-y-5">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">
          When & where
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
          Publish plan
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pick cadence, then tweak any platform
        </p>
      </div>

      {onCadence ? (
        <ComposerCadenceBar
          active={cadenceActive}
          onSelect={onCadence}
          disabled={draft.platforms.length === 0}
        />
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Times
        </p>
        <button
          type="button"
          onClick={onSuggestTimes}
          disabled={suggestBusy || draft.platforms.length === 0}
          data-testid="suggest-times-btn"
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1.5 text-caption font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Best times
        </button>
      </div>

      {draft.platforms.length === 0 ? (
        <p className="rounded-md border border-line bg-paper-2 px-3 py-4 text-body-sm text-muted-foreground">
          Select where this reel posts to plan times.
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

            return (
              <li
                key={platform}
                className="rounded-md border border-line bg-card px-3 py-2.5"
                data-testid={`plan-slot-${platform.replace(/\s+/g, "-")}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: platformDotColor(platform) }}
                  />
                  <span className="text-body-sm font-semibold text-foreground">
                    {meta?.full ?? platform}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={slot?.dateValue ?? ""}
                    onChange={(e) =>
                      onUpdateTime(
                        platform,
                        e.target.value,
                        slot?.timeValue ?? "12:00",
                      )
                    }
                    className="rounded-md border border-line bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="time"
                    value={slot?.timeValue ?? ""}
                    onChange={(e) =>
                      onUpdateTime(
                        platform,
                        slot?.dateValue ?? toDateInputValue(today()),
                        e.target.value,
                      )
                    }
                    className="rounded-md border border-line bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {committed ? (
                  <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
                    {formatWhen(committed)}
                    {scheduleReasons?.[platform] ? (
                      <span className="text-muted-foreground/80">
                        {" "}
                        · {scheduleReasons[platform]}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[0.65rem] text-warning">Needs a time</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
