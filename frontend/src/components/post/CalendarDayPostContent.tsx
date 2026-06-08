import type { ScheduledPost } from "@/lib/mock-data";
import { DayPostCountChip } from "@/components/post/DayPostCountChip";

export function countPostsForEvent(
  posts: ScheduledPost[],
  eventId: string | null | undefined,
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined,
): number {
  if (!eventId) return 0;
  return posts.filter((post) => (resolveEventId ? resolveEventId(post) : post.eventId) === eventId)
    .length;
}

/** Renders a day-level count chip — detail and associate flows open from the day modal. */
export function CalendarDayPostContent({
  posts,
  date,
  onOpenPosts,
  dense = false,
  variant = "default",
  isAssociated,
  hoveredEventId,
  resolveEventId,
}: {
  posts: ScheduledPost[];
  date: Date;
  onOpenPosts: (posts: ScheduledPost[], date: Date) => void;
  dense?: boolean;
  variant?: "default" | "scheduled";
  isAssociated?: (post: ScheduledPost) => boolean;
  hoveredEventId?: string | null;
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
}) {
  if (posts.length === 0) return null;

  const unassociatedCount = isAssociated
    ? posts.filter((post) => !isAssociated(post)).length
    : 0;
  const eventHighlightCount = countPostsForEvent(posts, hoveredEventId, resolveEventId);

  return (
    <DayPostCountChip
      count={posts.length}
      dense={dense}
      variant={variant}
      unassociatedCount={unassociatedCount}
      eventHighlightCount={eventHighlightCount}
      onOpen={() => onOpenPosts(posts, date)}
    />
  );
}