import type { Platform } from "@/lib/mock-data";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import { formatScheduleAt } from "@/lib/schedule-display";

export type PlatformTimeDraft = { date: string; time: string };

export function PlatformTimeEditor({
  platforms,
  drafts,
  proposedTimes,
  onDraftChange,
}: {
  platforms: Platform[];
  drafts: Partial<Record<Platform, PlatformTimeDraft>>;
  proposedTimes?: Partial<Record<Platform, string>>;
  onDraftChange: (platform: Platform, draft: PlatformTimeDraft) => void;
}) {
  if (platforms.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground">Select at least one platform above.</p>
    );
  }

  return (
    <div className="divide-y divide-border" data-testid="platform-time-editor">
      {platforms.map((platform) => {
        const meta = PLATFORMS_BY_SHORT[platform];
        const draft = drafts[platform];
        const committed = proposedTimes?.[platform];

        if (!draft) return null;

        return (
          <div
            key={platform}
            className="flex flex-wrap items-center gap-3 px-4 py-3"
            data-testid={`platform-time-row-${platform.replace(/\s+/g, "-")}`}
          >
            <PlatformChip platform={platform} label={platform} size="sm" title={meta?.full} />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input
                type="date"
                value={draft.date}
                onChange={(e) => {
                  if (!e.target.value) return;
                  onDraftChange(platform, { ...draft, date: e.target.value });
                }}
                className="rounded-sm border border-border bg-background/60 px-2 py-1.5 font-mono text-[0.65rem] text-foreground focus:border-accent focus:outline-none"
              />
              <input
                type="time"
                value={draft.time}
                onChange={(e) => {
                  if (!e.target.value) return;
                  onDraftChange(platform, { ...draft, time: e.target.value });
                }}
                className="rounded-sm border border-border bg-background/60 px-2 py-1.5 font-mono text-[0.65rem] text-foreground focus:border-accent focus:outline-none"
              />
              {committed ? (
                <span className="font-mono text-[0.55rem] text-success">
                  {formatScheduleAt(committed)}
                </span>
              ) : (
                <span className="font-mono text-[0.55rem] text-muted-foreground/70">draft</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}