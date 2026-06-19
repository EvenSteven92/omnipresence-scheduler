import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import { PlatformChip } from "@/components/post/PlatformChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostDetailModal } from "@/components/post/PostDetailModal";
import { useWorkspace } from "@/lib/workspace-context";
import { todayStart } from "@/lib/demo-clock";
import { demoPreviewForPost } from "@/lib/demo-media";
import {
  contentCardAnchorDate,
  getQuietDaysInUpcomingWindow,
  getUpcomingContentCards,
  UPCOMING_WINDOW_DAYS,
} from "@/lib/scheduled-post-display";

export function DashboardUpNextQueue() {
  const { workspace } = useWorkspace();
  const scheduledPosts = workspace.scheduledPosts;
  const [detailPost, setDetailPost] = useState<ScheduledPost | null>(null);

  const upcoming = useMemo(
    () => getUpcomingContentCards(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );

  const gapDays = useMemo(
    () => getQuietDaysInUpcomingWindow(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );

  return (
    <section data-testid="dashboard-up-next" className="panel overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-title">Up next</h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
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
          className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-5 py-3"
        >
          <span className="flex items-center gap-2 text-body-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {gapDays.length} gap{gapDays.length === 1 ? "" : "s"} in your queue: {gapDays.join(", ")}
          </span>
          <Link to="/scheduler" className="btn-action-primary btn-action text-body-sm">
            <Plus className="h-3.5 w-3.5" />
            Fill the gap
          </Link>
        </div>
      ) : null}

      <div className="p-4">
        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing scheduled yet"
            description="Posts you schedule in the composer appear here in chronological order."
            action={
              <Link to="/scheduler" className="btn-action-primary btn-action">
                Create a post
              </Link>
            }
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((post) => {
              const when = contentCardAnchorDate(post);
              const preview = demoPreviewForPost(post);
              return (
                <li key={post.id}>
                  <button
                    type="button"
                    onClick={() => setDetailPost(post)}
                    data-testid={`up-next-${post.id}`}
                    className="flex w-full items-center gap-4 rounded-sm border border-border bg-surface-elevated px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-secondary/30"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm border border-border bg-background">
                      <img
                        src={preview.src}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
                      <p className="mt-0.5 text-body-sm text-muted-foreground">
                        {when.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        ·{" "}
                        {when.toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {post.platforms.map((p) => (
                          <PlatformChip key={p} platform={p} size="xs" />
                        ))}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {detailPost ? (
        <PostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />
      ) : null}
    </section>
  );
}