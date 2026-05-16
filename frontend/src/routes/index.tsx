import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { scheduledPosts, metrics, growthMatrix } from "@/lib/mock-data";
import { Eye, Heart, Share2, Activity, Link2, Users, UserCheck, Plus } from "lucide-react";
import { PostCard, type DisplayPost } from "@/components/post/PostCard";

const metricIcons = [Eye, Heart, Share2, Activity, Link2, Users, UserCheck];
const ranges = ["1 wk", "1 mnth", "3 mnths", "6 mnths", "1 yr", "Custom", "All-time"];

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
  const maxViews = Math.max(...growthMatrix.map((g) => g.views));

  return (
    <div className="pb-20">
      <PageHeader
        eyebrow="intel_dashboard_v2.0"
        title="Core Performance"
        actions={
          <>
            <button className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary">AI_Studio</button>
            <button className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary">Analytics</button>
            <button className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary">Bulk_Mode</button>
            <Link to="/scheduler" className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground">
              <Plus className="h-3 w-3" /> New_Post
            </Link>
          </>
        }
      />

      <div className="px-10 pt-8">
        {/* Range selector */}
        <div className="flex flex-wrap items-center gap-2">
          {ranges.map((r, i) => (
            <button
              key={r}
              className={`rounded-sm border border-border px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em] ${
                i === 1 ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-secondary"
              }`}
            >
              {r}
            </button>
          ))}
          <div className="ml-2 flex items-center gap-1">
            <span className="rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.65rem]">14</span>
            <span className="rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.14em]">week(s) ⌄</span>
          </div>
        </div>
        <p className="label-mono mt-3">vs prior period · custom: number + day(s) / week(s) / month(s) / year(s) · all-time: lifetime totals (no % change)</p>

        {/* Metric cards */}
        <div className="mt-6 grid grid-cols-2 gap-px bg-border md:grid-cols-3 xl:grid-cols-7">
          {metrics.map((m, i) => {
            const Icon = metricIcons[i];
            return (
              <div key={m.label} className="bg-surface p-5">
                <div className="flex items-start justify-between">
                  <div className="label-mono">{m.label.replace(/ /g, "_")}</div>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{m.value}</div>
                <div className={`mt-2 text-xs ${m.trend === "up" ? "text-success" : "text-danger"}`}>{m.delta}</div>
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

          <div className="mt-8 flex h-64 items-end gap-6 border-b border-border pb-2">
            {growthMatrix.map((g) => (
              <div key={g.platform} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div className="w-3 bg-foreground transition-all" style={{ height: `${(g.views / maxViews) * 100}%` }} />
                  <div className="w-3 bg-muted-foreground" style={{ height: `${(g.likes / maxViews) * 100}%` }} />
                  <div className="w-3 bg-border" style={{ height: `${(g.shares / maxViews) * 100}%` }} />
                </div>
                <div className="label-mono">{g.platform}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Queues */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="label-mono">scheduled_queue</div>
              <Link to="/calendar" className="label-mono hover:text-foreground">view_all →</Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {scheduledPosts.map((p) => {
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
                  mediaKind: "video",
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
          </div>

          <div className="panel flex flex-col p-6">
            <div className="label-mono mb-4">draft_queue</div>
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <span className="label-mono">no_drafts</span>
              <Link
                to="/scheduler"
                className="mt-2 inline-flex items-center gap-1 rounded-sm border border-border bg-background/60 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] hover:bg-secondary"
              >
                <Plus className="h-3 w-3" /> Compose
              </Link>
            </div>
          </div>
        </div>

        {/* Media grid */}
        <div className="mt-10">
          <div className="flex items-end justify-between">
            <div className="label-mono">media_card_grid — click to manage</div>
            <div className="label-mono">{scheduledPosts.length}_total_records</div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {scheduledPosts.map((p) => {
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
                mediaKind: "video",
                platforms: p.platforms.map((pl) => ({
                  platform: pl,
                  state: "scheduled" as const,
                })),
              };
              return <PostCard key={p.id} post={display} variant="media" onClick={() => {}} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
