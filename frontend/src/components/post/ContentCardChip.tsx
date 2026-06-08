import type { ScheduledPost } from "@/lib/mock-data";
import { demoPreviewForPost } from "@/lib/demo-media";
import {
  contentCardPublishSpread,
  inferMediaAspect,
  inferMediaKind,
  scheduledPostPlatformEntries,
} from "@/lib/scheduled-post-display";
import { EventAssociateStencil } from "@/components/events/EventAssociateStencil";
import {
  CARD_PREVIEW_HEIGHT,
  CardMediaBanner,
  CardMediaThumb,
  usesRailCardLayout,
} from "@/components/post/MediaPreview";
import { PlatformChip } from "./PlatformChip";
import { PlatformRow } from "./PlatformRow";

/** Metadata column width — day picker uses the wide preset for legibility. */
const CONTENT_WIDTH = {
  default: "w-52",
  wide: "w-64",
  dense: "w-36",
} as const;

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
  const interactive = !!onOpen;
  const needsEvent = !associated;
  const showHighlight = highlightUnassociated && needsEvent;
  const mediaKind = inferMediaKind(post.title);
  const aspectRatio = inferMediaAspect(post.title, mediaKind);
  const previewUrl = demoPreviewForPost({ id: post.id, title: post.title, mediaKind });
  const rail = usesRailCardLayout(aspectRatio, layout);
  const thumbSize = dense ? "sm" : "md";
  const fillsContainer = fit === "container" && rail;

  const borderClass = showHighlight
    ? "border-dashed border-warning/70 bg-warning/10 ring-1 ring-inset ring-warning/30"
    : variant === "scheduled"
      ? "border-dashed border-muted-foreground/45 bg-background/40"
      : "border-border bg-background/60";

  const contentWidth = dense
    ? CONTENT_WIDTH.dense
    : layout === "rail"
      ? CONTENT_WIDTH.wide
      : CONTENT_WIDTH.default;

  const widthClass = fillsContainer ? "w-full" : "inline-flex w-fit max-w-full";

  const metaBlock = (
    <div
      className={`flex min-h-0 flex-col justify-between overflow-hidden ${
        rail
          ? fillsContainer
            ? `min-w-0 flex-1 gap-1.5 p-2`
            : `${contentWidth} shrink-0 gap-1.5 p-2`
          : "flex-1 gap-1 p-2"
      }`}
    >
      <div className="min-w-0 space-y-0.5">
        {!dense && (
          <span className="label-mono text-[0.5rem] text-muted-foreground/80">
            1 card · {publishCount} publish{publishCount === 1 ? "" : "es"}
          </span>
        )}
        <span
          className={`block leading-tight text-foreground ${
            dense ? "line-clamp-1 text-[0.55rem]" : "line-clamp-2 text-[0.65rem]"
          }`}
        >
          {post.title}
        </span>
        {showSchedule ? (
          <span className={`block font-mono text-accent ${dense ? "text-[0.5rem]" : "text-[0.55rem]"}`}>
            {dense ? `${publishCount} · ${contentCardPublishSpread(post)}` : contentCardPublishSpread(post)}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        {dense ? (
          <span className="flex flex-wrap gap-0.5">
            {entries.map((e) => (
              <PlatformChip key={e.platform} platform={e.platform} size="xs" title={e.at} />
            ))}
          </span>
        ) : (
          <PlatformRow entries={entries} size="sm" compact />
        )}
        {needsEvent && onAssociate ? (
          <EventAssociateStencil dense={dense} onClick={onAssociate} />
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onOpen();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpen();
              }
            }
          : undefined
      }
      className={`group overflow-hidden rounded-sm border text-left transition-colors ${CARD_PREVIEW_HEIGHT} ${borderClass} ${
        interactive ? "cursor-pointer hover:border-accent" : ""
      } ${rail ? `flex ${widthClass}` : `flex flex-col ${widthClass}`} ${className}`}
    >
      {rail ? (
        <>
          <CardMediaThumb
            src={previewUrl}
            mediaKind={mediaKind}
            aspectRatio={aspectRatio}
            alt={post.title}
            size={thumbSize}
          />
          {metaBlock}
        </>
      ) : (
        <>
          <CardMediaBanner src={previewUrl} mediaKind={mediaKind} alt={post.title} />
          {metaBlock}
        </>
      )}
    </div>
  );
}