import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { draftFromPostDetail, stashRepublishDraft } from "@/lib/republish";
import { PageHeader } from "@/components/PageHeader";
import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Eye,
  Heart,
  Share2,
  Activity,
  Link2,
  Users,
  UserCheck,
  Download,
  ArrowRight,
  Sparkles,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { aiGenerate } from "@/lib/ai-client";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { useYouTubeMetrics } from "@/hooks/useYouTubeMetrics";
import { useMetaMetrics } from "@/hooks/useMetaMetrics";
import {
  buildLivePublishedPosts,
  hasLiveMetrics,
  mergeDailySeries,
  mergeMetrics,
  mergePlatformBreakdown,
} from "@/lib/live-metrics";
import {
  filterPublishedInTimeframe,
  getEngagementHeatmap,
  getPlatformBreakdown,
  isAllTime,
  timeframeLabel,
  type Timeframe,
} from "@/lib/timeframe";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { useWorkspace } from "@/lib/workspace-context";
import { TOP_PERFORMERS_DISPLAY_LIMIT, TopPerformerCard } from "@/components/post/TopPerformerCard";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { LiveDataBadge, SampleDataBadge } from "@/components/LiveDataBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopEventPerformersSection } from "@/components/events/TopEventPerformersSection";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — TORCC OmniPresence" },
      {
        name: "description",
        content:
          "Cross-platform analytics: trends, audience growth, per-platform breakdown, posting cadence heatmap and top performing posts.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const metricIcons = [UserCheck, Eye, Heart, Share2, Activity, Link2, Users];

const C = {
  fg: "var(--color-foreground)",
  muted: "var(--color-muted-foreground)",
  border: "var(--color-foreground)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  surface: "var(--color-surface)",
  paper: "var(--color-paper-2)",
};

const PALETTE = [
  "var(--color-accent)",
  "var(--color-foreground)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-muted-foreground)",
  "var(--color-danger)",
  "color-mix(in oklab, var(--color-accent) 50%, var(--color-foreground))",
];

function AnalyticsPage() {
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const { publishedPosts } = workspace;
  const { data: youtubeMetrics } = useYouTubeMetrics(workspaceId);
  const { data: metaMetrics } = useMetaMetrics(workspaceId);
  const [timeframe, setTimeframe] = useState<Timeframe>({ kind: "preset", preset: "1m" });
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

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
  const series = useMemo(
    () => mergeDailySeries(timeframe, workspace, liveBundle, livePublishedPosts),
    [timeframe, workspace, liveBundle, livePublishedPosts],
  );
  const breakdown = useMemo(
    () => mergePlatformBreakdown(timeframe, workspace, liveBundle, livePublishedPosts),
    [timeframe, workspace, liveBundle, livePublishedPosts],
  );
  const heatmap = useMemo(() => getEngagementHeatmap(), []);
  const allTime = isAllTime(timeframe);
  const topPublished = useMemo(
    () =>
      filterPublishedInTimeframe(livePublishedPosts, timeframe)
        .slice()
        .sort((a, b) => b.engagementRate - a.engagementRate)
        .slice(0, TOP_PERFORMERS_DISPLAY_LIMIT),
    [livePublishedPosts, timeframe],
  );

  const trendData = useMemo(() => bucketSeries(series, 30), [series]);

  const primaryMetrics = metrics.slice(0, 3);
  const secondaryMetrics = metrics.slice(3);

  const topPlatform = useMemo(() => {
    if (!breakdown.length) return null;
    return [...breakdown].sort((a, b) => b.views - a.views)[0];
  }, [breakdown]);

  function handleScheduleSimilar() {
    const top = topPublished[0];
    if (!top) return;
    const draft = draftFromPostDetail(top, { allowedPlatforms: workspace.platforms });
    stashRepublishDraft(workspaceId, draft);
    navigate({ to: "/scheduler" });
  }

  const dataHonestyBadge = hasLiveMetrics(liveBundle) ? <LiveDataBadge /> : <SampleDataBadge />;
  const isLive = hasLiveMetrics(liveBundle);

  async function generateSummary() {
    if (summaryBusy) return;
    setSummaryBusy(true);
    setSummaryError(null);
    try {
      const lines = metrics
        .map((m) => `${m.label}: ${m.value}${m.delta ? ` (${m.delta})` : ""}`)
        .join("; ");
      const brief =
        `Performance for ${workspace.name} — ${workspace.tagline}, over the ${timeframeLabel(timeframe)}. ` +
        `Active platforms: ${workspace.platforms.join(", ")}. Metrics — ${lines}.`;
      const text = await aiGenerate({ kind: "weekly_summary", brief, tone: workspace.voice });
      setSummary(text);
    } catch (e) {
      setSummaryError((e as Error).message || "Could not generate summary");
    } finally {
      setSummaryBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Analytics"
        description={`Performance for ${workspace.name} across every connected channel.`}
        actions={<NewEventPostActions />}
      />

      <div className="page-content mx-auto max-w-[1320px]">
        {publishedPosts.length === 0 && !isLive ? (
          <EmptyState
            icon={Activity}
            title="No analytics yet"
            description="Connect YouTube or Meta to pull live metrics, or publish posts to see performance here."
            action={
              <Link to="/workspaces" className="btn-action-primary btn-action">
                Connect a channel
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Sticky filter toolbar */}
            <div
              data-testid="analytics-toolbar"
              className="sticky top-0 z-20 -mx-1 rounded-md border border-foreground bg-card px-4 py-3 shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <TimeframeSelector value={timeframe} onChange={setTimeframe} className="flex-1" />
                <div className="flex shrink-0 items-center gap-2">
                  {dataHonestyBadge}
                  <Badge tone="default">{timeframeLabel(timeframe)}</Badge>
                </div>
              </div>
              <p className="mt-2 text-body-sm text-muted-foreground">
                {allTime
                  ? "Lifetime totals — no period comparison."
                  : `Compared to the prior ${timeframeLabel(timeframe)} · ${trendData.length} data points in view`}
              </p>
            </div>

            {/* Primary KPIs — visual hierarchy (top-left first) */}
            <section>
              <SectionLabel kicker="Overview" title="Key metrics" />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {primaryMetrics.map((m, i) => {
                  const Icon = metricIcons[i] ?? Activity;
                  return (
                    <KpiCard
                      key={m.label}
                      testId={`kpi-${m.key}`}
                      label={m.label}
                      value={m.value}
                      delta={m.delta}
                      trend={m.trend}
                      icon={Icon}
                      size="lg"
                      featured={i === 0}
                    />
                  );
                })}
              </div>
              {secondaryMetrics.length > 0 ? (
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {secondaryMetrics.map((m, i) => {
                    const Icon = metricIcons[i + 3] ?? Activity;
                    return (
                      <KpiCard
                        key={m.label}
                        testId={`kpi-${m.key}`}
                        label={m.label}
                        value={m.value}
                        delta={m.delta}
                        trend={m.trend}
                        icon={Icon}
                        size="sm"
                      />
                    );
                  })}
                </div>
              ) : null}
            </section>

            {/* Main + insight rail */}
            <div className="page-grid">
              <div className="page-grid-main space-y-6">
                <SectionLabel kicker="Trends" title="Engagement & growth" />
                <div className="grid gap-4 lg:grid-cols-2">
                  <ChartPanel
                    title="Engagement trend"
                    sub="Views, likes, and shares over the selected period."
                    dataBadge={dataHonestyBadge}
                  >
                    <div className="h-72">
                      <ResponsiveContainer>
                        <AreaChart
                          data={trendData}
                          margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="grad-views" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="grad-likes" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="5%"
                                stopColor="var(--color-foreground)"
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="95%"
                                stopColor="var(--color-foreground)"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            stroke="color-mix(in oklab, var(--color-foreground) 18%, transparent)"
                            strokeDasharray="3 4"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            stroke={C.muted}
                            tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke={C.muted}
                            tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                            tickLine={false}
                            axisLine={false}
                            width={42}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="views"
                            stroke="var(--color-accent)"
                            fill="url(#grad-views)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="likes"
                            stroke="var(--color-foreground)"
                            fill="url(#grad-likes)"
                            strokeWidth={1.75}
                          />
                          <Area
                            type="monotone"
                            dataKey="shares"
                            stroke="var(--color-success)"
                            fill="none"
                            strokeWidth={1.75}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <ChartLegend
                      items={[
                        { label: "Views", color: "var(--color-accent)" },
                        { label: "Likes", color: "var(--color-foreground)" },
                        { label: "Shares", color: "var(--color-success)" },
                      ]}
                    />
                  </ChartPanel>

                  <ChartPanel
                    title="Audience growth"
                    sub="Cumulative followers across connected platforms."
                    dataBadge={dataHonestyBadge}
                  >
                    <div className="h-72">
                      <ResponsiveContainer>
                        <LineChart
                          data={trendData}
                          margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid
                            stroke="color-mix(in oklab, var(--color-foreground) 18%, transparent)"
                            strokeDasharray="3 4"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            stroke={C.muted}
                            tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke={C.muted}
                            tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                            tickLine={false}
                            axisLine={false}
                            width={50}
                            domain={["dataMin", "dataMax"]}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Line
                            type="monotone"
                            dataKey="followers"
                            stroke="var(--color-accent)"
                            strokeWidth={2.25}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <FollowerSummary points={trendData} />
                  </ChartPanel>
                </div>

                <SectionLabel kicker="Platforms" title="Where reach comes from" />
                <div className="grid gap-4 lg:grid-cols-3">
                  <ChartPanel
                    title="Per-platform views"
                    sub="Stacked views, likes, and shares by network."
                    className="lg:col-span-2"
                    dataBadge={dataHonestyBadge}
                  >
                    <div className="h-72">
                      <ResponsiveContainer>
                        <BarChart
                          data={breakdown}
                          margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid
                            stroke="color-mix(in oklab, var(--color-foreground) 18%, transparent)"
                            strokeDasharray="3 4"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="platform"
                            stroke={C.muted}
                            tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke={C.muted}
                            tick={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                            tickLine={false}
                            axisLine={false}
                            width={42}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="views" stackId="a" fill="var(--color-accent)" />
                          <Bar dataKey="likes" stackId="a" fill="var(--color-foreground)" />
                          <Bar dataKey="shares" stackId="a" fill="var(--color-success)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <ChartLegend
                      items={[
                        { label: "Views", color: "var(--color-accent)" },
                        { label: "Likes", color: "var(--color-foreground)" },
                        { label: "Shares", color: "var(--color-success)" },
                      ]}
                    />
                  </ChartPanel>

                  <ChartPanel
                    title="Share of engagement"
                    sub="Where conversation is concentrated."
                    dataBadge={dataHonestyBadge}
                  >
                    <div className="h-64">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={breakdown}
                            dataKey="views"
                            nameKey="platform"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={90}
                            paddingAngle={3}
                            stroke="var(--color-background)"
                            strokeWidth={2}
                          >
                            {breakdown.map((_, i) => (
                              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-1 grid grid-cols-1 gap-1.5">
                      {breakdown.map((b, i) => (
                        <div
                          key={b.platform}
                          className="flex items-center gap-2 rounded-md border border-foreground/20 bg-paper-2 px-2.5 py-1.5"
                        >
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm border border-foreground"
                            style={{ background: PALETTE[i % PALETTE.length] }}
                          />
                          <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">
                            {PLATFORMS_BY_SHORT[b.platform]?.full ?? b.platform}
                          </span>
                          <span className="font-data text-[0.7rem] text-muted-foreground">
                            {b.views.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ChartPanel>
                </div>
              </div>

              {/* Insight rail */}
              <aside className="page-grid-rail space-y-4 lg:sticky lg:top-28 lg:self-start">
                <section className="rounded-md border border-foreground bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="page-kicker">Insights</p>
                      <h2 className="mt-1 font-display text-lg font-bold text-foreground">
                        What&apos;s working
                      </h2>
                      <p className="mt-1 text-body-sm text-muted-foreground">
                        AI reads your numbers and suggests next moves.
                      </p>
                    </div>
                    <Sparkles className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.75} />
                  </div>
                  <button
                    type="button"
                    onClick={generateSummary}
                    disabled={summaryBusy}
                    data-testid="ai-summary-btn"
                    className="btn-action-primary btn-action mt-4 w-full justify-center disabled:opacity-50"
                  >
                    {summaryBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    {summary ? "Regenerate" : "Summarize performance"}
                  </button>
                  {summaryError ? (
                    <p className="mt-3 text-body-sm text-destructive">{summaryError}</p>
                  ) : null}
                  {summary ? (
                    <p className="mt-4 whitespace-pre-line rounded-md border border-foreground bg-paper-2 p-3 text-body-sm leading-relaxed text-foreground">
                      {summary}
                    </p>
                  ) : (
                    <p className="mt-3 text-body-sm text-muted-foreground">
                      Generate a short brief for {workspace.name} covering this timeframe.
                    </p>
                  )}
                </section>

                {topPlatform ? (
                  <section className="rounded-md border border-foreground bg-accent/15 p-5">
                    <p className="text-eyebrow">Top channel</p>
                    <div className="mt-2 flex items-center gap-2">
                      <PlatformChip platform={topPlatform.platform} size="md" />
                      <span className="font-display text-base font-bold text-foreground">
                        {PLATFORMS_BY_SHORT[topPlatform.platform]?.full ?? topPlatform.platform}
                      </span>
                    </div>
                    <p className="mt-2 font-data text-2xl font-bold text-foreground">
                      {topPlatform.views.toLocaleString()}
                      <span className="ml-1 text-body-sm font-normal text-muted-foreground">
                        views
                      </span>
                    </p>
                    <p className="mt-1 text-body-sm text-muted-foreground">
                      Leading network in this range by total views.
                    </p>
                  </section>
                ) : null}

                <section className="rounded-md border border-foreground bg-card p-5">
                  <p className="text-eyebrow">Actions</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleScheduleSimilar}
                      disabled={topPublished.length === 0}
                      data-testid="schedule-similar-btn"
                      className="btn-action-primary btn-action w-full justify-center disabled:opacity-50"
                    >
                      Schedule similar <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      to="/workspaces"
                      hash="connect-platform"
                      className="btn-action btn-action-secondary w-full justify-center"
                    >
                      Manage channels
                    </Link>
                    <button
                      type="button"
                      data-testid="export-csv-btn"
                      disabled
                      title="CSV export ships with live analytics — coming soon"
                      className="btn-action btn-action-secondary w-full justify-center opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                  </div>
                </section>
              </aside>
            </div>

            {/* Cadence */}
            <section>
              <SectionLabel kicker="Cadence" title="When engagement peaks" />
              <ChartPanel
                title="Posting cadence heatmap"
                sub="Darker cells mean higher engagement — plan posts for high-score hours."
                dataBadge={dataHonestyBadge}
                className="mt-3"
              >
                <Heatmap grid={heatmap} />
              </ChartPanel>
            </section>

            {/* Platform table */}
            <section>
              <SectionLabel kicker="Breakdown" title="Per-platform performance" />
              <ChartPanel
                title="Platform table"
                sub="Sortable snapshot of posts, reach, and engagement rate."
                dataBadge={dataHonestyBadge}
                className="mt-3"
              >
                <PlatformTable rows={breakdown} />
              </ChartPanel>
            </section>

            {/* Top content */}
            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-3">
                <div>
                  <p className="page-kicker">Content</p>
                  <h2 className="mt-1 font-display text-xl font-bold text-foreground">
                    Top performing cards
                  </h2>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    {timeframeLabel(timeframe)} — open a card for full publish history.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleScheduleSimilar}
                  disabled={topPublished.length === 0}
                  className="btn-action btn-action-secondary disabled:opacity-50"
                >
                  Schedule similar <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {topPublished.length === 0 ? (
                <div className="rounded-md border border-foreground bg-card px-5 py-10 text-center text-sm text-muted-foreground">
                  No published posts in this range
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {topPublished.map((p, i) => (
                    <TopPerformerCard
                      key={p.id}
                      post={p}
                      rank={i + 1}
                      events={workspace.events}
                      onOpen={() =>
                        navigate({
                          to: "/card/$cardId",
                          params: { cardId: p.id },
                          search: { from: "analytics" },
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            <TopEventPerformersSection timeframe={timeframe} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Layout primitives ───────────────────────────────────────────────────────

function SectionLabel({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="page-kicker">{kicker}</p>
      <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  size,
  featured,
  testId,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat" | string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  size: "lg" | "sm";
  featured?: boolean;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-md border border-foreground bg-card",
        size === "lg" ? "p-5" : "p-4",
        featured && "bg-accent/10 ",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "flex items-center justify-center rounded-md border border-foreground",
            size === "lg" ? "h-8 w-8 bg-paper-2" : "h-7 w-7 bg-paper-2",
          )}
        >
          <Icon className={size === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={1.75} />
        </span>
      </div>
      <div
        className={cn(
          "mt-3 font-display font-bold tracking-tight text-foreground",
          size === "lg" ? "text-[2rem] leading-none" : "text-xl leading-none",
        )}
      >
        {value}
      </div>
      {delta ? (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 font-data text-[0.7rem] font-semibold",
            trend === "up"
              ? "text-success"
              : trend === "down"
                ? "text-destructive"
                : "text-muted-foreground",
          )}
        >
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : null}
          {delta}
          <span className="font-sans font-normal text-muted-foreground">vs prior</span>
        </div>
      ) : null}
    </div>
  );
}

function ChartPanel({
  title,
  sub,
  action,
  children,
  className = "",
  dataBadge,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dataBadge?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border border-foreground bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-foreground px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold text-foreground">{title}</h3>
            {dataBadge}
          </div>
          {sub ? (
            <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">{sub}</p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {items.map((i) => (
        <span
          key={i.label}
          className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.06em] text-muted-foreground"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm border border-foreground"
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// ─── helpers + charts ────────────────────────────────────────────────────────

function bucketSeries(
  series: { date: string; views: number; likes: number; shares: number; followers: number }[],
  buckets: number,
) {
  if (series.length <= buckets) {
    return series.map((p) => ({ ...p, label: shortLabel(p.date) }));
  }
  const size = Math.ceil(series.length / buckets);
  const out: Array<{
    label: string;
    views: number;
    likes: number;
    shares: number;
    followers: number;
  }> = [];
  for (let i = 0; i < series.length; i += size) {
    const slice = series.slice(i, i + size);
    out.push({
      label: shortLabel(slice[Math.floor(slice.length / 2)].date),
      views: slice.reduce((s, p) => s + p.views, 0),
      likes: slice.reduce((s, p) => s + p.likes, 0),
      shares: slice.reduce((s, p) => s + p.shares, 0),
      followers: slice[slice.length - 1].followers,
    });
  }
  return out;
}

function shortLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function FollowerSummary({ points }: { points: { label: string; followers: number }[] }) {
  if (points.length < 2) return null;
  const first = points[0].followers;
  const last = points[points.length - 1].followers;
  const diff = last - first;
  const pct = first === 0 ? 0 : (diff / first) * 100;
  return (
    <div className="mt-3 flex items-baseline justify-between border-t border-foreground/20 pt-3">
      <div className="text-body-sm text-muted-foreground">Net growth</div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-data text-sm font-bold",
            diff >= 0 ? "text-success" : "text-destructive",
          )}
        >
          {diff >= 0 ? "+" : ""}
          {diff.toLocaleString()}
        </span>
        <span className="font-data text-[0.7rem] text-muted-foreground">
          {pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-md border border-foreground bg-card px-3 py-2 font-data text-[0.7rem] text-foreground ">
      {label ? (
        <div className="mb-1.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </div>
      ) : null}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block h-2 w-2 rounded-sm border border-foreground"
            style={{ background: p.color }}
          />
          <span className="capitalize text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-bold text-foreground">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ grid }: { grid: number[][] }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div data-testid="cadence-heatmap" className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="ml-12 grid" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="text-center font-data text-[0.625rem] text-muted-foreground"
            >
              {h % 3 === 0 ? `${h.toString().padStart(2, "0")}` : ""}
            </div>
          ))}
        </div>
        <div className="mt-1 space-y-0.5">
          {grid.map((row, d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-10 shrink-0 font-mono text-[0.6875rem] font-semibold text-muted-foreground">
                {days[d]}
              </span>
              <div
                className="grid flex-1 gap-px"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {row.map((v, h) => (
                  <div
                    key={h}
                    title={`${days[d]} · ${h.toString().padStart(2, "0")}:00 · score ${(v * 100).toFixed(0)}`}
                    className="aspect-square rounded-[2px] border border-foreground/10"
                    style={{
                      background: `color-mix(in oklab, var(--color-accent) ${Math.round(v * 100)}%, var(--color-paper-2))`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 font-mono text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          Low
          <div className="flex overflow-hidden rounded-sm border border-foreground">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
              <div
                key={v}
                className="h-3.5 w-5"
                style={{
                  background: `color-mix(in oklab, var(--color-accent) ${Math.round(v * 100)}%, var(--color-paper-2))`,
                }}
              />
            ))}
          </div>
          High
        </div>
      </div>
    </div>
  );
}

function PlatformTable({ rows }: { rows: ReturnType<typeof getPlatformBreakdown> }) {
  const max = Math.max(...rows.map((r) => r.views), 1);
  return (
    <div data-testid="platform-table" className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-foreground font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <th className="px-3 py-3 text-left">Platform</th>
            <th className="px-3 py-3 text-right">Posts</th>
            <th className="px-3 py-3 text-right">Views</th>
            <th className="px-3 py-3 text-right">Likes</th>
            <th className="px-3 py-3 text-right">Shares</th>
            <th className="px-3 py-3 text-right">Eng. rate</th>
            <th className="px-3 py-3 text-left" title="Share of total views in range">
              View share
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = PLATFORMS_BY_SHORT[r.platform as keyof typeof PLATFORMS_BY_SHORT];
            const sharePct = ((r.views / max) * 100).toFixed(0);
            return (
              <tr
                key={r.platform}
                className="border-b border-foreground/15 last:border-b-0"
                style={{
                  boxShadow: meta ? `inset 3px 0 0 0 ${meta.brandColor}` : undefined,
                }}
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {meta ? <PlatformChip platform={r.platform} size="xs" /> : null}
                    <span className="font-medium text-foreground">{meta?.full ?? r.platform}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-data text-foreground">
                  {r.posts.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right font-data text-foreground">
                  {r.views.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right font-data text-foreground">
                  {r.likes.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right font-data text-foreground">
                  {r.shares.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right font-data font-semibold text-accent">
                  {(r.engagement * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded-sm border border-foreground bg-paper-2">
                      <div
                        className="h-full"
                        style={{
                          width: `${sharePct}%`,
                          background: meta?.brandColor ?? "var(--color-accent)",
                        }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-data text-xs text-muted-foreground">
                      {sharePct}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
