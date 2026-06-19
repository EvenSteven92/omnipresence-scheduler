import { Link } from "@tanstack/react-router";
import { CalendarClock, Pencil } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import { PlatformChip } from "@/components/post/PlatformChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { contentCardAnchorDate } from "@/lib/scheduled-post-display";
import { demoPreviewForPost } from "@/lib/demo-media";

export function CalendarQueueView({
  posts,
  onSelectPost,
}: {
  posts: ScheduledPost[];
  onSelectPost: (post: ScheduledPost) => void;
}) {
  const sorted = [...posts].sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b));

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nothing scheduled yet"
        description="Posts you schedule in the composer will show up here in chronological order."
        action={
          <Link to="/scheduler" className="btn-action-primary btn-action">
            Create a post
          </Link>
        }
      />
    );
  }

  return (
    <div data-testid="calendar-queue-view" className="space-y-2">
      {sorted.map((post) => {
        const when = contentCardAnchorDate(post);
        const preview = demoPreviewForPost(post);
        return (
          <button
            key={post.id}
            type="button"
            onClick={() => onSelectPost(post)}
            data-testid={`queue-item-${post.id}`}
            className="flex w-full items-center gap-4 rounded-sm border border-border bg-surface-elevated px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-secondary/30"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm border border-border bg-background">
              <img src={preview.src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
              <p className="mt-0.5 text-body-sm text-muted-foreground">
                {when.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {post.platforms.map((p) => (
                  <PlatformChip key={p} platform={p} size="xs" />
                ))}
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-body-sm text-muted-foreground">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </span>
          </button>
        );
      })}
    </div>
  );
}
