import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { useWorkspace } from "@/lib/workspace-context";
import type { PublishedPost } from "@/lib/mock-data";
import { PostDetailModal } from "@/components/post/PostDetailModal";
import { ArrowRight } from "lucide-react";
import { TOP_PERFORMERS_DISPLAY_LIMIT, TopPerformerCard } from "@/components/post/TopPerformerCard";
import { useMemo, useState } from "react";
import { useYouTubeMetrics } from "@/hooks/useYouTubeMetrics";
import { useMetaMetrics } from "@/hooks/useMetaMetrics";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { TopEventPerformersSection } from "@/components/events/TopEventPerformersSection";
import { GrowthMatrixChart } from "@/components/GrowthMatrixChart";
import { DashboardUpNextQueue } from "@/components/dashboard/DashboardUpNextQueue";
import { DashboardKpiRail } from "@/components/dashboard/DashboardKpiRail";
import { DashboardChannelHealth } from "@/components/dashboard/DashboardChannelHealth";
import {
  buildLivePublishedPosts,
  mergeGrowthMatrixRows,
  mergeMetrics,
} from "@/lib/live-metrics";
import {
  filterPublishedInTimeframe,
  isAllTime,
  timeframeLabel,
  type Timeframe,
} from "@/lib/timeframe";

const DASHBOARD_TIMEFRAME: Timeframe = { kind: "preset", preset: "1w" };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TORCC OmniSocial" },
      {
        name: "description",
        content: "Cross-platform performance, scheduled queue, and draft pipeline at a glance.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { workspace } = useWorkspace();
  const timeframe = DASHBOARD_TIMEFRAME;
  const { publishedPosts } = workspace;
  const { data: youtubeMetrics } = useYouTubeMetrics(workspace.id);
  const { data: metaMetrics } = useMetaMetrics(workspace.id);
  const { data: accountStatus } = usePlatformConnections(workspace.id);
  const liveBundle = useMemo(
    () => ({ youtube: youtubeMetrics, meta: metaMetrics }),
    [youtubeMetrics, metaMetrics],
  );
  const livePublishedPosts = useMemo(
    () => buildLivePublishedPosts(publishedPosts, liveBundle),
    [publishedPosts, liveBundle],
  );
  const metrics = useMemo(
    () => mergeMetrics(timeframe, workspace, liveBundle, livePublishedPosts),
    [timeframe, workspace, liveBundle, livePublishedPosts],
  );
  const growthRows = useMemo(
    () => mergeGrowthMatrixRows(timeframe, workspace, liveBundle, livePublishedPosts),
    [timeframe, workspace, liveBundle, livePublishedPosts],
  );
  const allTime = isAllTime(timeframe);

  return (
    <div>
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Dashboard"
        actions={
          <>
            <Link to="/analytics" className="btn-action">
              Analytics
            </Link>
            <NewEventPostActions />
          </>
        }
      />

      <div className="page-content">
        <OnboardingChecklist className="mb-6" />

        <div className="page-grid">
          <div className="page-grid-main space-y-6">
            <DashboardUpNextQueue />
          </div>

          <aside className="page-grid-rail space-y-4">
            <DashboardKpiRail metrics={metrics} liveBundle={liveBundle} />
            <DashboardChannelHealth
              workspace={workspace}
              youtubeLive={accountStatus?.youtube.connected ?? false}
            />
            <TopPerformersStrip publishedPosts={livePublishedPosts} timeframe={timeframe} />
            <TopEventPerformersSection timeframe={timeframe} className="" />
          </aside>
        </div>

        <div className="panel section-block p-6">
          <div
            id="dashboard-timeframe"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"
          >
            <p className="text-body-sm text-muted-foreground">
              Cross-platform growth ·{" "}
              <span className="text-foreground">last 7 days</span>
              {!allTime ? ` · compared to prior ${timeframeLabel(timeframe)}` : null}
            </p>
            <Link
              to="/analytics"
              className="text-body-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Full analytics →
            </Link>
          </div>
          <GrowthMatrixChart rows={growthRows} timeframe={timeframe} />
        </div>
      </div>
    </div>
  );
}

function TopPerformersStrip({
  publishedPosts,
  timeframe,
}: {
  publishedPosts: PublishedPost[];
  timeframe: Timeframe;
}) {
  const [detailPost, setDetailPost] = useState<PublishedPost | null>(null);
  const top = useMemo(() => {
    const recent = filterPublishedInTimeframe(publishedPosts, timeframe);
    return [...recent]
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, TOP_PERFORMERS_DISPLAY_LIMIT);
  }, [publishedPosts, timeframe]);

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-title">Top performers</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {timeframeLabel(timeframe)} · ranked by engagement rate
          </p>
        </div>
        <Link to="/analytics" className="btn-action text-body-sm">
          Full analytics <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="p-4">
        {top.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-muted-foreground">
            No published posts in this range
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {top.map((p, i) => (
              <TopPerformerCard
                key={p.id}
                post={p}
                isTop={i === 0}
                onOpen={() => setDetailPost(p)}
              />
            ))}
          </div>
        )}
      </div>

      {detailPost ? (
        <PostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />
      ) : null}
    </section>
  );
}