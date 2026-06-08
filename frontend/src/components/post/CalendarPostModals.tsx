import type { ScheduledPost } from "@/lib/mock-data";
import type { PostDetailSource } from "@/lib/post-detail";
import type { ContentEvent } from "@/lib/workspaces/types";
import type { CalendarDayGrid } from "@/hooks/useCalendarPostSelection";
import { DayPostsGridModal } from "@/components/post/DayPostsGridModal";
import { PostDetailModal } from "@/components/post/PostDetailModal";

export function CalendarPostModals({
  dayGrid,
  detailPost,
  events = [],
  resolveEventId,
  onCloseDayGrid,
  onCloseDetail,
  onSelectFromGrid,
  highlightUnassociated = false,
  isAssociated,
  onAssociatePost,
}: {
  dayGrid: CalendarDayGrid | null;
  detailPost: PostDetailSource | null;
  events?: ContentEvent[];
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  onCloseDayGrid: () => void;
  onCloseDetail: () => void;
  onSelectFromGrid: (post: PostDetailSource) => void;
  highlightUnassociated?: boolean;
  isAssociated?: (post: ScheduledPost) => boolean;
  onAssociatePost?: (post: ScheduledPost, e: React.MouseEvent) => void;
}) {
  return (
    <>
      {dayGrid ? (
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
      ) : null}
      {detailPost ? <PostDetailModal post={detailPost} onClose={onCloseDetail} /> : null}
    </>
  );
}