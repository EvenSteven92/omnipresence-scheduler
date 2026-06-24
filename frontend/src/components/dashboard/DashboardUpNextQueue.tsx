import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostDetailModal } from "@/components/post/PostDetailModal";
import { StreamContentCard } from "@/components/ui/StreamContentCard";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";
import { todayStart } from "@/lib/demo-clock";
import {
  contentCardAnchorDate,
  getQuietDaysInUpcomingWindow,
  getUpcomingContentCards,
  UPCOMING_WINDOW_DAYS,
} from "@/lib/scheduled-post-display";

function groupPostsByDay(posts: ScheduledPost[]) {
  const map = new Map<string, ScheduledPost[]>();
  for (const post of posts) {
    const date = contentCardAnchorDate(post);
    const key = date.toDateString();
    const bucket = map.get(key) ?? [];
    bucket.push(post);
    map.set(key, bucket);
  }
  return [...map.entries()]
    .sort(([a], [b]) => +new Date(a) - +new Date(b))
    .map(([key, dayPosts]) => {
      const date = new Date(key);
      const publishCount = dayPosts.reduce((sum, p) => sum + p.platforms.length, 0);
      return {
        date,
        weekday: date.toLocaleDateString(undefined, { weekday: "long" }),
        dateLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        countLabel: `${dayPosts.length} card${dayPosts.length === 1 ? "" : "s"} · ${publishCount} publish${publishCount === 1 ? "" : "es"}`,
        posts: dayPosts.sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b)),
      };
    });
}

export function DashboardUpNextQueue() {
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );
  const scheduledPosts = workspace.scheduledPosts;
  const [detailPost, setDetailPost] = useState<ScheduledPost | null>(null);

  const upcoming = useMemo(
    () => getUpcomingContentCards(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );

  const dayGroups = useMemo(() => groupPostsByDay(upcoming), [upcoming]);

  const gapDays = useMemo(
    () => getQuietDaysInUpcomingWindow(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );

  return (
    <section data-testid="dashboard-up-next" className="min-w-0">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-[1.5px] border-foreground pb-4">
        <div>
          <p className="page-kicker">Content queue</p>
          <h2 className="mt-2 font-display text-[2rem] font-bold leading-none tracking-tight text-foreground">
            Up next
          </h2>
          <p className="mt-2 text-body-sm text-muted-foreground">
            Next {UPCOMING_WINDOW_DAYS} days — {upcoming.length} scheduled post
            {upcoming.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link to="/calendar" className="btn-action text-body-sm">
          View calendar
        </Link>
      </header>

      {gapDays.length > 0 && upcoming.length > 0 ? (
        <div
          data-testid="queue-gap-warning"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border-[1.5px] border-foreground bg-foreground px-4 py-4 text-background"
        >
          <span className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {gapDays.length} gap day{gapDays.length === 1 ? "" : "s"}: {gapDays.join(", ")}
          </span>
          <Link
            to="/scheduler"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 font-display text-sm font-bold text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Fill the gaps
          </Link>
        </div>
      ) : null}

      {upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled yet"
          description="Posts you schedule in the composer appear here in chronological order."
          action={
            <Link to="/scheduler" className="btn-action-primary btn-action">
              Create a card
            </Link>
          }
          className="border-[1.5px] border-foreground bg-card py-10"
        />
      ) : (
        <div className="space-y-7">
          {dayGroups.map((group) => (
            <section key={group.date.toISOString()}>
              <div className="mb-3 flex items-baseline gap-3">
                <span className="font-display text-xl font-bold text-foreground">{group.dateLabel}</span>
                <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {group.weekday}
                </span>
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-[0.625rem] font-semibold text-muted-foreground">
                  {group.countLabel}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {group.posts.map((post) => (
                  <StreamContentCard
                    key={post.id}
                    post={post}
                    events={events}
                    testId={`up-next-${post.id}`}
                    onOpen={() => setDetailPost(post)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {detailPost ? (
        <PostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />
      ) : null}
    </section>
  );
}