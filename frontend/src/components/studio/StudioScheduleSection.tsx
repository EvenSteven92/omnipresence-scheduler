import { ChevronDown, Loader2 } from "lucide-react";
import { PlatformDestinationPicker } from "@/components/composer/PlatformDestinationPicker";
import type { DraftPost } from "@/lib/composer-draft";
import type { Platform } from "@/lib/mock-data";
import { toDateInputValue, toTimeInputValue } from "@/lib/schedule-engine";
import { cn } from "@/lib/utils";

export function StudioScheduleSection({
  open,
  draft,
  workspacePlatforms,
  busy,
  canCommit,
  onToggle,
  onPlatforms,
  onTime,
  onBestTimes,
  onCommit,
}: {
  open: boolean;
  draft: DraftPost;
  workspacePlatforms: Platform[];
  busy?: boolean;
  canCommit: boolean;
  onToggle: () => void;
  onPlatforms: (platforms: Platform[]) => void;
  onTime: (platform: Platform, dateStr: string, timeStr: string) => void;
  onBestTimes: () => void;
  onCommit: () => void;
}) {
  return (
    <section className="border-t border-line" data-testid="studio-schedule-section">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Destinations & times
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="space-y-3 px-3 pb-3"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <PlatformDestinationPicker
              draft={draft}
              workspacePlatforms={workspacePlatforms}
              onChange={onPlatforms}
            />
            {draft.platforms.length > 0 ? (
              <ul className="space-y-2">
                {draft.platforms.map((p) => {
                  const iso = draft.proposedTimes?.[p];
                  const dateStr = iso ? toDateInputValue(new Date(iso)) : "";
                  const timeStr = iso ? toTimeInputValue(iso) : "";
                  return (
                    <li
                      key={p}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-paper-2 px-2 py-1.5"
                    >
                      <span className="w-16 shrink-0 text-caption font-semibold text-foreground">
                        {p}
                      </span>
                      <input
                        type="date"
                        value={dateStr}
                        onChange={(e) => onTime(p, e.target.value, timeStr || "12:00")}
                        className="min-w-0 flex-1 rounded border border-line bg-card px-1.5 py-1 text-xs"
                      />
                      <input
                        type="time"
                        value={timeStr}
                        onChange={(e) =>
                          onTime(p, dateStr || toDateInputValue(new Date()), e.target.value)
                        }
                        className="w-[5.5rem] rounded border border-line bg-card px-1.5 py-1 text-xs"
                      />
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onBestTimes}
                disabled={busy || draft.platforms.length === 0}
                className="btn-action btn-action-secondary min-h-9 flex-1 text-caption disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Best times
              </button>
              <button
                type="button"
                onClick={onCommit}
                disabled={!canCommit}
                data-testid="studio-commit"
                className="btn-action btn-action-primary min-h-9 flex-1 !text-white text-caption disabled:opacity-50"
              >
                Schedule reel
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
