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
  Legend,
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
} from "lucide-react";
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
import { PostDetailModal } from "@/components/post/PostDetailModal";
import type { PublishedPost } from "@/lib/mock-data";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { LiveDataBadge, SampleDataBadge } from "@/components/LiveDataBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopEventPerformersSection } from "@/components/events/TopEventPerformersSection";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — TORCC OmniSocial" },
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

// Aesthetic — terminal monochrome with the signal-orange accent
const C = {
  fg: "var(--color-foreground)",
  muted: "var(--color-muted-foreground)",
  border: "var(--color-border)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  surface: "var(--color-surface)",
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

// ─── Page ───────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const { publishedPosts } = workspace;
  const { data: youtubeMetrics } = useYouTubeMetrics(workspaceId);
  const { data: metaMetrics } = useMetaMetrics(workspaceId);
  const [timeframe, setTimeframe] = useState<Timeframe>({ kind: "preset", preset: "1m" });
  const [detailPost, setDetailPost] = useState<PublishedPost | null>(null);
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

  // Aggregate series into ~30 buckets for legibility on longer timeframes
  const trendData = useMemo(() => bucketSeries(series, 30), [series]);

  function handleScheduleSimilar() {
    const top = topPublished[0];
    if (!top) return;
    const draft = draftFromPostDetail(top, { allowedPlatforms: workspace.platforms });
    stashRepublishDraft(workspaceId, draft);
    navigate({ to: "/scheduler" });
  }

  const dataHonestyBadge = hasLiveMetrics(liveBundle) ? (
    <LiveDataBadge />
  ) : (
    <SampleDataBadge />
  );

  return (
    <div>
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Analytics"
        actions={<NewEventPostActions />}
      />

      <div className="page-content">
        {publishedPosts.length === 0 && !hasLiveMetrics(liveBundle) ? (
          <EmptyState
            icon={Activity}
            title="No analytics yet"
            description="Connect YouTube or Meta to pull live metrics, or publish posts to see performance here."
            action={
              <Link to="/workspaces" className="btn-action-primary btn-action">
                Connect a channel
              </Link>
            }
            className="mt-4"
          />
        ) : (
          <>
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {allTime
                  ? "Lifetime totals — no period comparison."
                  : `Compared to the prior ${timeframeLabel(timeframe)} · ${trendData.length} data points`}
              </p>
              {hasLiveMetrics(liveBundle) ? <LiveDataBadge /> : <SampleDataBadge />}
            </div>

            {/* KPI strip */}
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
              {metrics.map((m, i) => {
                const Icon = metricIcons[i];
                return (
                  <div key={m.label} data-testid={`kpi-${m.key}`} className="kpi-card metric-cell">
                    <div className="flex items-start justify-between">
                      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        {m.label}
                      </div>
                      <Icon className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                    <div className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
                      {m.value}
                    </div>
                    {m.delta ? (
                      <div
                        title={
                          m.key === "engagement" ? "Percentage points vs prior period" : undefined
                        }
                        className={`mt-1 text-[0.65rem] ${
                          m.trend === "up"
                            ? "text-success"
                            : m.trend === "down"
                              ? "text-danger"
                              : "text-muted-foreground"
                        }`}
                      >
                        {m.delta}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Engagement trend + Audience growth */}
            <div className="section-block grid gap-8 lg:grid-cols-2">
              <Panel
                title="Engagement trend"
                sub="Views, likes, and shares plotted daily over the selected period."
                dataBadge={dataHonestyBadge}
              >
                <div className="h-72">
                  <ResponsiveContainer>
                    <AreaChart data={trendData} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="grad-views" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="grad-likes" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="var(--color-foreground)"
                            stopOpacity={0.35}
                          />
                          <stop offset="95%" stopColor="var(--color-foreground)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="2 4" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke={C.muted}
                        tick={{ fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={C.muted}
                        tick={{ fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                      />
                      <Tooltip content={<TerminalTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="var(--color-accent)"
                        fill="url(#grad-views)"
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="likes"
                        stroke="var(--color-foreground)"
                        fill="url(#grad-likes)"
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="shares"
                        stroke="var(--color-success)"
                        fill="none"
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <Legend3
                  items={[
                    { label: "views", color: "var(--color-accent)" },
                    { label: "likes", color: "var(--color-foreground)" },
                    { label: "shares", color: "var(--color-success)" },
                  ]}
                />
              </Panel>

              <Panel
                title="Audience growth"
                sub="Cumulative followers across all connected platforms."
                dataBadge={dataHonestyBadge}
              >
                <div className="h-72">
                  <ResponsiveContainer>
                    <LineChart data={trendData} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="2 4" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke={C.muted}
                        tick={{ fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={C.muted}
                        tick={{ fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                        domain={["dataMin", "dataMax"]}
                      />
                      <Tooltip content={<TerminalTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="followers"
                        stroke="var(--color-accent)"
                        strokeWidth={1.75}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <FollowerSummary points={trendData} />
              </Panel>
            </div>

            {/* Platform breakdown + share-of-engagement */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <Panel
                title="Per-platform views"
                sub="Stacked views, likes, and shares by platform."
                className="lg:col-span-2"
                dataBadge={dataHonestyBadge}
              >
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={breakdown} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="2 4" vertical={false} />
                      <XAxis
                        dataKey="platform"
                        stroke={C.muted}
                        tick={{ fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={C.muted}
                        tick={{ fontSize: 10, fontFamily: "monospace" }}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                      />
                      <Tooltip content={<TerminalTooltip />} />
                      <Bar dataKey="views" stackId="a" fill="var(--color-accent)" />
                      <Bar dataKey="likes" stackId="a" fill="var(--color-foreground)" />
                      <Bar dataKey="shares" stackId="a" fill="var(--color-success)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Legend3
                  items={[
                    { label: "views", color: "var(--color-accent)" },
                    { label: "likes", color: "var(--color-foreground)" },
                    { label: "shares", color: "var(--color-success)" },
                  ]}
                />
              </Panel>

              <Panel
                title="Share of engagement"
                sub="Where the conversation is happening."
                dataBadge={dataHonestyBadge}
              >
                <div className="h-72">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={breakdown}
                        dataKey="views"
                        nameKey="platform"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={88}
                        paddingAngle={2}
                        stroke="var(--color-background)"
                        strokeWidth={2}
                      >
                        {breakdown.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<TerminalTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-1 px-1 pb-1">
                  {breakdown.map((b, i) => (
                    <div key={b.platform} className="flex items-center gap-1.5 text-[0.6rem]">
                      <span
                        className="inline-block h-2 w-2"
                        style={{ background: PALETTE[i % PALETTE.length] }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {PLATFORMS_BY_SHORT[b.platform]?.full ?? b.platform}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Cadence heatmap */}
            <div className="mt-6">
              <Panel
                title="Posting cadence"
                sub="When your audience engages most — darker cells mean higher engagement."
                dataBadge={dataHonestyBadge}
              >
                <Heatmap grid={heatmap} />
              </Panel>
            </div>

            {/* Per-platform performance table */}
            <div className="mt-6">
              <Panel
                title="Per-platform performance"
                dataBadge={dataHonestyBadge}
                action={
                  <button
                    type="button"
                    data-testid="export-csv-btn"
                    disabled
                    title="CSV export ships with live analytics — coming soon"
                    className="flex cursor-not-allowed items-center gap-2 rounded-sm border border-border bg-background/40 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground opacity-50"
                  >
                    <Download className="h-3 w-3" /> Export CSV
                  </button>
                }
              >
                <PlatformTable rows={breakdown} />
              </Panel>
            </div>

            {/* Top performers */}
            <section className="section-block">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Top performers · {timeframeLabel(timeframe)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click a post to view its per-platform publish history.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleScheduleSimilar}
                  disabled={topPublished.length === 0}
                  data-testid="schedule-similar-btn"
                  className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Schedule similar <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {topPublished.length === 0 ? (
                <div className="rounded-sm border border-dashed border-border bg-surface/40 px-5 py-10 text-center text-sm text-muted-foreground">
                  No published posts in this range
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {topPublished.map((p, i) => (
                    <TopPerformerCard
                      key={p.id}
                      post={p}
                      isTop={i === 0}
                      onOpen={() => setDetailPost(p)}
                    />
                  ))}
                </div>
              )}
            </section>

            <TopEventPerformersSection timeframe={timeframe} />
          </>
        )}
      </div>

      {detailPost ? (
        <PostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />
      ) : null}
    </div>
  );
}

// ─── helpers + sub-components ───────────────────────────────────────────────

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

function Panel({
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
    <section className={`overflow-hidden rounded-sm border border-border bg-surface-elevated ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-title text-sm">{title}</div>
            {dataBadge}
          </div>
          {sub ? <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">{sub}</p> : null}
        </div>
        {action}
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Legend3({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-2 flex items-center gap-3 px-1">
      {items.map((i) => (
        <span
          key={i.label}
          className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground"
        >
          <span className="inline-block h-2 w-2" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function FollowerSummary({ points }: { points: { label: string; followers: number }[] }) {
  if (points.length < 2) return null;
  const first = points[0].followers;
  const last = points[points.length - 1].followers;
  const diff = last - first;
  const pct = first === 0 ? 0 : (diff / first) * 100;
  return (
    <div className="mt-2 flex items-baseline justify-between px-1">
      <div className="text-xs text-muted-foreground">Net growth</div>
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-sm ${diff >= 0 ? "text-success" : "text-danger"}`}>
          {diff >= 0 ? "+" : ""}
          {diff.toLocaleString()}
        </span>
        <span className="label-mono">
          {pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function TerminalTooltip({
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
    <div className="rounded-sm border border-border bg-background/95 px-3 py-2 font-mono text-[0.65rem] text-foreground shadow-lg backdrop-blur">
      {label && <div className="label-mono mb-1">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2" style={{ background: p.color }} />
          <span className="label-mono">{p.name}</span>
          <span className="ml-auto text-foreground">{p.value.toLocaleString()}</span>
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
            <div key={h} className="text-center text-[0.625rem] text-muted-foreground">
              {h % 3 === 0 ? `${h.toString().padStart(2, "0")}` : ""}
            </div>
          ))}
        </div>
        <div className="mt-1 space-y-0.5">
          {grid.map((row, d) => (
            <div key={d} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[0.6875rem] text-muted-foreground">
                {days[d]}
              </span>
              <div
                className="grid flex-1"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
              >
                {row.map((v, h) => (
                  <div
                    key={h}
                    title={`${days[d]} · ${h.toString().padStart(2, "0")}:00 · score ${(v * 100).toFixed(0)}`}
                    className="aspect-square m-px"
                    style={{
                      background: `color-mix(in oklab, var(--color-accent) ${Math.round(v * 100)}%, var(--color-surface))`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
          low
          <div className="flex">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
              <div
                key={v}
                className="h-3 w-4"
                style={{
                  background: `color-mix(in oklab, var(--color-accent) ${Math.round(v * 100)}%, var(--color-surface))`,
                }}
              />
            ))}
          </div>
          high
        </div>
      </div>
    </div>
  );
}

function PlatformTable({ rows }: { rows: ReturnType<typeof getPlatformBreakdown> }) {
  const max = Math.max(...rows.map((r) => r.views));
  return (
    <div data-testid="platform-table" className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            <th className="px-3 py-2 text-left font-normal">Platform</th>
            <th className="px-3 py-2 text-right font-normal">Posts</th>
            <th className="px-3 py-2 text-right font-normal">Views</th>
            <th className="px-3 py-2 text-right font-normal">Likes</th>
            <th className="px-3 py-2 text-right font-normal">Shares</th>
            <th className="px-3 py-2 text-right font-normal">Eng. rate</th>
            <th className="px-3 py-2 text-left font-normal" title="Share of total views in range">
              View share
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const meta = PLATFORMS_BY_SHORT[r.platform as keyof typeof PLATFORMS_BY_SHORT];
            const sharePct = ((r.views / Math.max(max, 1)) * 100).toFixed(0);
            return (
              <tr
                key={r.platform}
                className="border-b border-border/60 last:border-b-0"
                style={{
                  boxShadow: meta ? `inset 3px 0 0 0 ${meta.brandColor}` : undefined,
                }}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {meta ? <PlatformChip platform={r.platform} size="xs" /> : null}
                    <span className="text-foreground">{meta?.full ?? r.platform}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  {r.posts.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  {r.views.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  {r.likes.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  {r.shares.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono text-accent">
                  {(r.engagement * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-sm bg-background/60">
                      <div
                        className="h-full"
                        style={{
                          width: `${sharePct}%`,
                          background: meta?.brandColor ?? "var(--color-accent)",
                        }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground">
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
