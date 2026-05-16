import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  scheduledPosts,
  publishedPosts,
  platformConnections,
  growthMatrix,
} from "@/lib/mock-data";
import {
  Eye,
  Heart,
  Share2,
  Activity,
  Link2,
  Users,
  UserCheck,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { PostCard, type DisplayPost } from "@/components/post/PostCard";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { useMemo, useState } from "react";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { getMetrics, isAllTime, timeframeLabel, type Timeframe } from "@/lib/timeframe";

const metricIcons = [Eye, Heart, Share2, Activity, Link2, Users, UserCheck];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TORCC OmniSocial" },
      { name: "description", content: "Cross-platform performance, scheduled queue, and draft pipeline at a glance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>({ kind: "preset", preset: "1m" });
  const maxViews = Math.max(...growthMatrix.map((g) => g.views));
  const metrics = useMemo(() => getMetrics(timeframe), [timeframe]);
  const allTime = isAllTime(timeframe);

  return (
    <div className="pb-20">
      <PageHeader
        eyebrow="intel_dashboard_v2.0"
        title="Core Performance"
        actions={
          <>
            <Link to="/ai-studio" className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary">AI_Studio</Link>
            <Link to="/analytics" className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary">Analytics</Link>
            <Link to="/scheduler" className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground">
              <Plus className="h-3 w-3" /> New_Post
            </Link>
          </>
        }
      />

      <div className="px-10 pt-8">
        {/* Range selector */}
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        <p className="label-mono mt-3">
          {allTime
            ? "lifetime totals · no period comparison"
            : `vs prior ${timeframeLabel(timeframe)} · % change reflects same-length prior window`}
        </p>

        {/* Metric cards */}
        <div className="mt-6 grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-7">
          {metrics.map((m, i) => {
            const Icon = metricIcons[i];
            return (
              <div key={m.label} data-testid={`metric-${m.key}`} className="bg-surface p-5">
                <div className="flex items-start justify-between">
                  <div className="label-mono">{m.label.replace(/ /g, "_")}</div>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{m.value}</div>
                {m.delta && (
                  <div
                    className={`mt-2 text-xs ${
                      m.trend === "up" ? "text-success" : m.trend === "down" ? "text-danger" : "text-muted-foreground"
                    }`}
                  >
                    {m.delta}
                  </div>
                )}
                {m.note && <p className="label-mono mt-3 leading-relaxed normal-case tracking-normal">{m.note}</p>}
              </div>
            );
          })}
        </div>

        {/* Growth matrix */}
        <div className="panel mt-8 p-6">
          <div className="flex items-center justify-between">
            <div className="label-mono">cross_platform_growth_matrix</div>
            <div className="flex items-center gap-4 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-foreground" /> Views</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-muted-foreground" /> Likes</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-border" /> Shares</span>
            </div>
          </div>

          <div className="mt-8 flex h-64 items-stretch gap-6 border-b border-border pb-2">
            {growthMatrix.map((g) => (
              <div key={g.platform} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end justify-center gap-1">
                  <div className="w-3 bg-foreground transition-all" style={{ height: `${(g.views / maxViews) * 100}%` }} />
                  <div className="w-3 bg-muted-foreground" style={{ height: `${(g.likes / maxViews) * 100}%` }} />
                  <div className="w-3 bg-border" style={{ height: `${(g.shares / maxViews) * 100}%` }} />
                </div>
                <div className="label-mono">{g.platform}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming this week */}
        <UpcomingSection />

        {/* Top performers */}
        <TopPerformersSection />

        {/* Connection health */}
        <HealthStrip />
      </div>
    </div>
  );
}

// ─── Upcoming this week ─────────────────────────────────────────────────────

function UpcomingSection() {
  const upcoming = useMemo(() => {
    const now = new Date(2026, 4, 13); // demo "now"
    return [...scheduledPosts]
      .filter((p) => new Date(p.date).getTime() >= now.getTime())
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .slice(0, 6);
  }, []);

  // Detect agenda gaps in the next 7 days (no posts on a given day)
  const gapWarning = useMemo(() => {
    const today = new Date(2026, 4, 13);
    const dates = new Set(upcoming.map((p) => new Date(p.date).toDateString()));
    const gaps: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (!dates.has(d.toDateString())) gaps.push(d.toLocaleDateString(undefined, { weekday: "short" }));
    }
    return gaps;
  }, [upcoming]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-mono">upcoming · next_7d</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {upcoming.length === 0
              ? "Nothing in the queue — drop assets in Scheduler to fill peak windows."
              : `${upcoming.length} posts scheduled across your connected platforms.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gapWarning.length > 0 && (
            <span
              data-testid="queue-gap-warning"
              className="inline-flex items-center gap-1.5 rounded-sm border border-warning/60 bg-warning/10 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-warning"
            >
              <AlertTriangle className="h-3 w-3" />
              {gapWarning.length}_quiet_day{gapWarning.length === 1 ? "" : "s"}: {gapWarning.join("·")}
            </span>
          )}
          <Link
            to="/calendar"
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
          >
            View_Calendar <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/scheduler"
            className="inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3 w-3" /> New_Post
          </Link>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border bg-surface/40 px-5 py-10 text-center label-mono">
          queue_is_empty — head to the scheduler to drop assets
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((p) => {
            const display: DisplayPost = {
              id: p.id,
              title: p.title,
              status: p.status,
              when: new Date(p.date).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              platforms: p.platforms.map((pl) => ({
                platform: pl,
                state: "scheduled" as const,
                at: new Date(p.date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }),
              })),
            };
            return <PostCard key={p.id} post={display} variant="compact" />;
          })}
        </div>
      )}
    </section>
  );
}

// ─── Top performing posts ────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function TopPerformersSection() {
  const top = useMemo(
    () => [...publishedPosts].sort((a, b) => b.engagementRate - a.engagementRate),
    [],
  );

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="label-mono">top_performers · last_30d</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked by engagement rate — pull insights into your next campaign.
          </p>
        </div>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
        >
          Full_Analytics <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {top.map((p, i) => {
          const display: DisplayPost = {
            id: p.id,
            title: p.title,
            status: "published",
            when: new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            mediaKind: "video",
            platforms: p.platforms.map((pl) => ({
              platform: pl,
              state: "published" as const,
            })),
          };
          return (
            <div key={p.id} className="relative">
              {i === 0 && (
                <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-sm border border-success/60 bg-success/10 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-success">
                  <TrendingUp className="h-2.5 w-2.5" /> top
                </span>
              )}
              <PostCard post={display} variant="media" onClick={() => {}} />
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-sm border border-border bg-surface px-2 py-1.5 text-center">
                <Stat label="views" value={fmtNum(p.views)} />
                <Stat label="likes" value={fmtNum(p.likes)} />
                <Stat label="eng" value={`${(p.engagementRate * 100).toFixed(1)}%`} highlight />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className={`font-mono text-sm ${highlight ? "text-accent" : "text-foreground"}`}>{value}</div>
      <div className="label-mono text-[0.55rem]">{label}</div>
    </div>
  );
}

// ─── Connection health strip ────────────────────────────────────────────────

function HealthStrip() {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-end justify-between">
        <div className="label-mono">platform_connections</div>
        <span className="label-mono text-muted-foreground/70">click to manage</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {platformConnections.map((c) => {
          const meta = PLATFORMS_BY_SHORT[c.platform];
          const Icon = meta?.Icon;
          const ok = c.status === "ok";
          const expiring = c.status === "expiring";
          const down = c.status === "disconnected";
          return (
            <div
              key={c.platform}
              data-testid={`connection-${c.platform.replace(/\s+/g, "-")}`}
              className={`flex items-center justify-between rounded-sm border bg-surface px-3 py-2.5 transition-colors hover:bg-secondary/40 ${
                ok ? "border-border" : expiring ? "border-warning/60" : "border-danger/60"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {Icon && (
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Icon className="h-3 w-3" strokeWidth={2} />
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-foreground">{c.platform}</div>
                  <div
                    className={`label-mono text-[0.5rem] ${
                      ok ? "text-success" : expiring ? "text-warning" : "text-danger"
                    }`}
                  >
                    {ok && "connected"}
                    {expiring && `expires_${c.expiresInDays}d`}
                    {down && "reconnect"}
                  </div>
                </div>
              </div>
              {ok && <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />}
              {expiring && <AlertTriangle className="h-3 w-3 shrink-0 text-warning" />}
              {down && <XCircle className="h-3 w-3 shrink-0 text-danger" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
