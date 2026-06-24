import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { CardPublishChip } from "@/components/ui/CardPublishChip";
import { CardStatusBadge } from "@/components/ui/CardStatusBadge";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";
import {
  cardStatusFromPost,
  inferCardMediaType,
  publishEntriesForPost,
  resolveAlbumLabel,
} from "@/lib/card-display";

export function StreamContentCard({
  post,
  events,
  onOpen,
  testId,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  post: ScheduledPost;
  events: ContentEvent[];
  onOpen?: () => void;
  testId?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const mediaType = inferCardMediaType(post.title);
  const status = cardStatusFromPost(post);
  const publishes = publishEntriesForPost(post);
  const publishCount = post.platforms.length;

  return (
    <ContentCard
      size="stream"
      testId={testId ?? `stream-card-${post.id}`}
      eyebrow={resolveAlbumLabel(post, events)}
      title={post.title}
      platforms={publishes.map((entry) => (
        <CardPublishChip key={entry.platform} label={entry.label} dotColor={entry.dotColor} />
      ))}
      onOpen={onOpen}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      thumbnail={
        <CardThumbnail
          post={post}
          alt={post.title}
          layout="square"
          mediaType={mediaType}
        />
      }
      trailing={
        <>
          <CardStatusBadge status={status} />
          <div className="text-right">
            <span className="font-display text-[1.375rem] font-bold leading-none text-foreground">
              {publishCount}
            </span>{" "}
            <span className="font-mono text-[0.5625rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Pub
            </span>
          </div>
        </>
      }
    />
  );
}