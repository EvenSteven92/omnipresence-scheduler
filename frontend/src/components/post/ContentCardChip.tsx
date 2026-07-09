import type { ScheduledPost } from "@/lib/mock-data";
import {
  contentCardPublishSpread,
  inferMediaAspect,
  inferMediaKind,
  scheduledPostPlatformEntries,
} from "@/lib/scheduled-post-display";
import { EventAssociateButton } from "@/components/events/EventAssociateButton";
import { usesRailCardLayout } from "@/components/post/MediaPreview";
import { PlatformChip } from "./PlatformChip";
import { PlatformRow } from "./PlatformRow";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";

export function ContentCardChip({
  post,
  onOpen,
  dense = false,
  variant = "default",
  layout = "auto",
  fit = "content",
  showSchedule = true,
  associated = true,
  highlightUnassociated = false,
  onAssociate,
  className = "",
}: {
  post: ScheduledPost;
  onOpen?: () => void;
  dense?: boolean;
  variant?: "default" | "scheduled";
  /** `rail` keeps title + platforms beside the thumb (16:9, square, reel, etc.). */
  layout?: "auto" | "rail";
  fit?: "content" | "container";
  /** Hide publish times on album cards — details live in the post modal. */
  showSchedule?: boolean;
  associated?: boolean;
  highlightUnassociated?: boolean;
  onAssociate?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const entries = showSchedule
    ? scheduledPostPlatformEntries(post)
    : post.platforms.map((platform) => ({
        platform,
        state:
          post.status === "published"
            ? ("published" as const)
            : post.status === "scheduled"
              ? ("scheduled" as const)
              : ("pending" as const),
      }));
  const publishCount = post.platforms.length;
  const needsEvent = !associated;
  const showHighlight = highlightUnassociated && needsEvent;
  const mediaKind = inferMediaKind(post.title);
  const aspectRatio = inferMediaAspect(post.title, mediaKind);
  const rail = usesRailCardLayout(aspectRatio, layout);
  const thumbHeight = dense ? "sm" : "md";
  const fillsContainer = fit === "container" && rail;

  const cardVariant = showHighlight
    ? "highlight"
    : variant === "scheduled"
      ? "scheduled"
      : "default";

  const eyebrow = !dense ? (
    <span className="label-mono text-[0.5rem] text-muted-foreground/80">
      1 card · {publishCount} publish{publishCount === 1 ? "" : "es"}
    </span>
  ) : null;

  const meta =
    showSchedule && (dense || !dense)
      ? dense
        ? `${publishCount} · ${contentCardPublishSpread(post)}`
        : contentCardPublishSpread(post)
      : undefined;

  const platforms = (
    <>
      {dense ? (
        <span className="flex flex-wrap gap-0.5">
          {entries.map((e) => (
            <PlatformChip
              key={e.platform}
              platform={e.platform}
              size="xs"
              title={"at" in e ? e.at : undefined}
            />
          ))}
        </span>
      ) : (
        <PlatformRow entries={entries} size="sm" compact />
      )}
      {needsEvent && onAssociate ? (
        <EventAssociateButton dense={dense} onClick={onAssociate} />
      ) : null}
    </>
  );

  return (
    <ContentCard
      size={dense ? "chip" : "sm"}
      orientation={rail ? "rail" : "stacked"}
      variant={cardVariant}
      fullWidth={fillsContainer}
      eyebrow={eyebrow}
      title={post.title}
      meta={meta}
      platforms={platforms}
      onOpen={onOpen}
      className={className}
      thumbnail={
        <CardThumbnail
          post={post}
          alt={post.title}
          kind={mediaKind}
          layout={rail ? "rail" : "banner"}
          height={thumbHeight}
        />
      }
    />
  );
}
