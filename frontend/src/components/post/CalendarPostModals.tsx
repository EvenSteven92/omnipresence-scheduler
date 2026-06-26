import type { ScheduledPost } from "@/lib/mock-data";
import type { PostDetailSource } from "@/lib/post-detail";
import type { ContentEvent } from "@/lib/workspaces/types";
import type { CalendarDayGrid } from "@/hooks/useCalendarPostSelection";
import { DayPostsGridModal } from "@/components/post/DayPostsGridModal";

export function CalendarPostModals({
  dayGrid,
  events = [],
  resolveEventId,
  onCloseDayGrid,
  onSelectFromGrid,
  highlightUnassociated = false,
  isAssociated,
  onAssociatePost,
}: {
  dayGrid: CalendarDayGrid | null;
  events?: ContentEvent[];
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  onCloseDayGrid: () => void;
  onSelectFromGrid: (post: PostDetailSource) => void;
  highlightUnassociated?: boolean;
  isAssociated?: (post: ScheduledPost) => boolean;
  onAssociatePost?: (post: ScheduledPost, e: React.MouseEvent) => void;
}) {
  if (!dayGrid) return null;

  return (
    <DayPostsGridModal
      date={dayGrid.date}
      posts={dayGrid.posts}
      events={events}
      resolveEventId={resolveEventId}
      onSelect={onSelectFromGrid}
      onClose={onCloseDayGrid}
      highlightUnassociated={highlightUnassociated}
      isAssociated={isAssociated}
      onAssociatePost={onAssociatePost}
    />
  );
}
