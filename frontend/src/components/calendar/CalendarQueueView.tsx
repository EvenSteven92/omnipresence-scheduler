import { Link } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";

import type { ScheduledPost } from "@/lib/mock-data";
import { EmptyState } from "@/components/ui/EmptyState";
import { StreamContentCard } from "@/components/ui/StreamContentCard";
import { contentCardAnchorDate } from "@/lib/scheduled-post-display";

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
  compact?: boolean;
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
            Create a card
          </Link>
        }
      />
    );
  }

  return (
    <div data-testid="calendar-queue-view" className="space-y-3">
      {sorted.map((post) => (
        <StreamContentCard
          key={post.id}
          post={post}
          testId={`queue-item-${post.id}`}
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
        />
      ))}
    </div>
  );
}

export { DRAG_POST_TYPE };
