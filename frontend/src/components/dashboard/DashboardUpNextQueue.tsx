import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { useMemo } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import { EmptyState } from "@/components/ui/EmptyState";
import { StreamContentCard } from "@/components/ui/StreamContentCard";
import { useWorkspace } from "@/lib/workspace-context";
import { todayStart } from "@/lib/demo-clock";
import {
  contentCardAnchorDate,
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
  const navigate = useNavigate();
  const { workspace } = useWorkspace();
  const scheduledPosts = workspace.scheduledPosts;

  const upcoming = useMemo(
    () => getUpcomingContentCards(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );

  const dayGroups = useMemo(() => groupPostsByDay(upcoming), [upcoming]);

  function openCard(cardId: string) {
    navigate({ to: "/card/$cardId", params: { cardId }, search: { from: "queue" } });
  }

  return (
    <section data-testid="dashboard-up-next" className="min-w-0">
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
                <span className="font-display text-xl font-bold text-foreground">
                  {group.dateLabel}
                </span>
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
                    testId={`up-next-${post.id}`}
                    onOpen={() => openCard(post.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
