import { Link } from "@tanstack/react-router";
import { CalendarClock, Pencil } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import { EmptyState } from "@/components/ui/EmptyState";
import { ContentCard } from "@/components/ui/ContentCard";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { PlatformChip } from "@/components/post/PlatformChip";
import { contentCardAnchorDate } from "@/lib/scheduled-post-display";
import { inferMediaKind } from "@/lib/scheduled-post-display";

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
        const mediaKind = inferMediaKind(post.title);

        return (
          <ContentCard
            key={post.id}
            size="row"
            fullWidth={compact}
            testId={`queue-item-${post.id}`}
            title={post.title}
            meta={
              <>
                {when.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              </>
            }
            platforms={
              !compact ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {post.platforms.map((p) => (
                    <PlatformChip key={p} platform={p} size="xs" />
                  ))}
                </div>
              ) : null
            }
            trailing={
              !compact ? (
                <span className="flex shrink-0 items-center gap-1 text-body-sm text-muted-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </span>
              ) : null
            }
            onOpen={() => onSelectPost(post)}
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
            thumbnail={
              <div
                className={`shrink-0 overflow-hidden rounded-md border border-border bg-background ${
                  compact ? "h-10 w-10" : "h-14 w-14"
                }`}
              >
                <CardThumbnail post={post} alt={post.title} kind={mediaKind} layout="fixed" />
              </div>
            }
          />
        );
      })}
    </div>
  );
}

export { DRAG_POST_TYPE };