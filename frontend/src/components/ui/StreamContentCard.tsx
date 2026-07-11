import { useMemo } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import { CardPublishChip } from "@/components/ui/CardPublishChip";
import { CardStatusBadge } from "@/components/ui/CardStatusBadge";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";
import { TrafficLight } from "@/components/ui/TrafficLight";
import {
  cardStatusFromPost,
  inferCardMediaType,
  publishEntriesForPost,
  resolveAlbumLabel,
} from "@/lib/card-display";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { useWorkspace } from "@/lib/workspace-context";

export function StreamContentCard({
  post,
  onOpen,
  testId,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  post: ScheduledPost;
  onOpen?: () => void;
  testId?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const { resolveEventId } = useEventAssociations(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );
  const mediaType = inferCardMediaType(post.title);
  const status = cardStatusFromPost(post);
  const publishes = publishEntriesForPost(post);
  const publishCount = post.platforms.length;
  const albumLabel = resolveAlbumLabel(post, events, resolveEventId);

  return (
    <ContentCard
      size="stream"
      testId={testId ?? `stream-card-${post.id}`}
      eyebrow={albumLabel !== "Unassigned" ? albumLabel : undefined}
      title={post.title}
      platforms={publishes.map((entry) => (
        <CardPublishChip key={entry.platform} label={entry.label} dotColor={entry.dotColor} />
      ))}
      onOpen={onOpen}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      thumbnail={
        <div className="relative h-full w-full">
          <CardThumbnail
            post={post}
            alt={post.title}
            layout="square"
            mediaType={mediaType}
            variant="gradient"
          />
          <span className="absolute left-2 top-2 drop-shadow-sm">
            <TrafficLight status={status} size="md" />
          </span>
        </div>
      }
      trailing={
        <>
          <CardStatusBadge status={status} />
          <div className="text-right">
            <span className="font-display text-[1.375rem] font-bold leading-none text-foreground">
              {publishCount}
            </span>{" "}
            <span className="font-mono text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {publishCount === 1 ? "where" : "where"}
            </span>
          </div>
        </>
      }
    />
  );
}
