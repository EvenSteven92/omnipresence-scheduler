import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { useWorkspace } from "@/lib/workspace-context";
import { platformDotColor } from "@/lib/card-display";
import { todayStart } from "@/lib/demo-clock";
import type { Platform } from "@/lib/mock-data";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import {
  computeQueueWeekStats,
  formatGapDaysSentence,
  getQuietDaysInUpcomingWindow,
  UPCOMING_WINDOW_DAYS,
} from "@/lib/scheduled-post-display";

const STAT_CELLS: Array<{
  key: keyof ReturnType<typeof computeQueueWeekStats>;
  label: string;
  accent?: boolean;
}> = [
  { key: "scheduled", label: "Scheduled" },
  { key: "drafts", label: "Drafts" },
  { key: "gapDays", label: "Gap days", accent: true },
  { key: "publishes", label: "Publishes" },
];

/** Primary connected channels shown in the design mock. */
const CHANNEL_ORDER: Platform[] = ["YT", "FB", "IG", "RUMBLE", "TIKTOK", "X"];

export function DashboardQueueRail() {
  const { workspace, workspaceId } = useWorkspace();
  const { data: accountStatus } = usePlatformConnections(workspaceId);
  const fromDay = todayStart();

  const stats = useMemo(
    () => computeQueueWeekStats(workspace.scheduledPosts, fromDay),
    [workspace.scheduledPosts, fromDay],
  );

  const gapLabels = useMemo(
    () => getQuietDaysInUpcomingWindow(workspace.scheduledPosts, fromDay, UPCOMING_WINDOW_DAYS),
    [workspace.scheduledPosts, fromDay],
  );

  const gapSentence = formatGapDaysSentence(gapLabels);

  const channelRows = useMemo(() => {
    const liveSet = new Set(accountStatus?.livePlatforms ?? ["YT", "FB", "IG"]);
    return CHANNEL_ORDER.filter((p) => workspace.platforms.includes(p) && liveSet.has(p));
  }, [accountStatus?.livePlatforms, workspace.platforms]);

  const liveCount = channelRows.length;

  return (
    <aside className="queue-rail flex flex-col gap-4" data-testid="dashboard-queue-rail">
      <section className="panel overflow-hidden p-[18px]">
        <div className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
          THIS WEEK
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-[1.5px] overflow-hidden rounded-lg border border-line bg-line">
          {STAT_CELLS.map(({ key, label, accent }) => (
            <div
              key={key}
              data-testid={`queue-stat-${key}`}
              className={`px-3 py-3 ${accent ? "bg-foreground" : "bg-card"}`}
            >
              <div
                className={`font-display text-[1.75rem] font-semibold leading-none ${
                  accent ? "text-white" : "text-foreground"
                }`}
              >
                {stats[key]}
              </div>
              <div
                className={`mt-0.5 text-[0.5625rem] font-medium uppercase tracking-[0.06em] ${
                  accent ? "text-white/70" : "text-muted-foreground"
                }`}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        data-testid="queue-gaps-panel"
        className="overflow-hidden rounded-lg border border-line bg-foreground p-[18px] text-background"
      >
        <div className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-background/70">
          GAPS IN QUEUE
        </div>
        <p className="mt-2.5 font-display text-[1.1875rem] font-semibold leading-snug text-background">
          {gapSentence}
        </p>
        <Link
          to="/scheduler"
          className="btn-action-primary btn-action mt-3.5 w-full justify-center"
        >
          Fill the gaps →
        </Link>
      </section>

      <section className="panel overflow-hidden p-[18px]">
        <div className="mb-3 font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
          CHANNELS · {liveCount} LIVE
        </div>
        <div className="flex flex-col gap-2.5">
          {channelRows.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">No live channels connected</p>
          ) : (
            channelRows.map((platform) => {
              const meta = PLATFORMS_BY_SHORT[platform];
              return (
                <div key={platform} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: platformDotColor(platform) }}
                  />
                  <span className="flex-1 text-[0.8125rem] font-semibold text-foreground">
                    {meta?.full ?? platform}
                  </span>
                  <span className="font-mono text-[0.5625rem] font-semibold uppercase text-success">
                    Live
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </aside>
  );
}
