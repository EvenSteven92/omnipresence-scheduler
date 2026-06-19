import { Link } from "@tanstack/react-router";
import { CalendarClock, Pencil } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import { PlatformChip } from "@/components/post/PlatformChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { contentCardAnchorDate } from "@/lib/scheduled-post-display";
import { demoPreviewForPost } from "@/lib/demo-media";

const DRAG_POST_TYPE = "application/x-scheduled-post";

export function CalendarQueueView({
  posts,
  onSelectPost,
  compact = false,
  draggable = false,
  onDragPost,
  onDragEnd,
}: {
  posts: ScheduledPost[];
  onSelectPost: (post: ScheduledPost) => void;
  /** Smaller list for sidebar rails. */
  compact?: boolean;
  /** Enable drag-to-reschedule from the list. */
  draggable?: boolean;
  onDragPost?: (postId: string) => void;
  onDragEnd?: () => void;
}) {
  const sorted = [...posts].sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b));

  if (sorted.length === 0) {
    if (compact) {
      return (
        <p className="py-4 text-center text-body-sm text-muted-foreground">Nothing scheduled</p>
      );
    }
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
            draggable={draggable}
            onDragStart={
              draggable
                ? (e) => {
                    e.dataTransfer.setData(DRAG_POST_TYPE, post.id);
                    e.dataTransfer.setData("text/plain", post.id);
                    e.dataTransfer.effectAllowed = "move";
                    onDragPost?.(post.id);
                  }
                : undefined
            }
            onDragEnd={draggable ? onDragEnd : undefined}
            onClick={() => onSelectPost(post)}
            data-testid={`queue-item-${post.id}`}
            className={`flex w-full items-center rounded-sm border border-border bg-surface-elevated text-left transition-colors hover:border-accent/40 hover:bg-secondary/30 ${
              compact ? "gap-3 px-3 py-2" : "gap-4 px-4 py-3"
            }`}
          >
            <div
              className={`shrink-0 overflow-hidden rounded-sm border border-border bg-background ${
                compact ? "h-10 w-10" : "h-14 w-14"
              }`}
            >
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
              {!compact ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {post.platforms.map((p) => (
                    <PlatformChip key={p} platform={p} size="xs" />
                  ))}
                </div>
              ) : null}
            </div>
            {!compact ? (
              <span className="flex shrink-0 items-center gap-1 text-body-sm text-muted-foreground">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export { DRAG_POST_TYPE };
