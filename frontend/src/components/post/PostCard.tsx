import { ArrowRight } from "lucide-react";
import {
  CARD_PREVIEW_HEIGHT,
  CardMediaBanner,
  CardMediaThumb,
  isLandscapeCardAspect,
} from "@/components/post/MediaPreview";
import { PlatformRow, type PlatformEntry } from "./PlatformRow";

export type PostStatus = "scheduled" | "draft" | "published" | "failed";

export interface DisplayPost {
  id: string;
  title: string;
  status: PostStatus;
  /** Optional date/time chip (top-right) */
  when?: string;
  /** Optional media kind for preview icon */
  mediaKind?: "image" | "video" | "none";
  /** CSS aspect-ratio — width scales from fixed card height. */
  aspectRatio?: string;
  /** Demo / uploaded thumbnail URL */
  previewUrl?: string;
  /** Platform footer entries */
  platforms: PlatformEntry[];
}

const STATUS_STYLE: Record<PostStatus, string> = {
  scheduled: "border-accent text-accent",
  draft:     "border-border text-muted-foreground",
  published: "border-success text-success",
  failed:    "border-danger text-danger",
};

/**
 * Read-only post card.
 * 16:9 landscape: preview on top, title + platforms below (fixed total height).
 * Other ratios: left-rail thumb with metadata on the right.
 */
export function PostCard({
  post,
  onClick,
  variant = "media",
  fit = "content",
  className = "",
}: {
  post: DisplayPost;
  onClick?: () => void;
  variant?: "media" | "compact";
  fit?: "content" | "container";
  className?: string;
}) {
  const interactive = !!onClick;
  const showMedia = variant === "media" || !!post.previewUrl;
  const aspectRatio = post.aspectRatio ?? "16/9";
  const stacked = showMedia && isLandscapeCardAspect(aspectRatio);
  const fillsContainer = fit === "container";
  const contentWidth = variant === "media" ? "w-56" : "w-52";
  const widthClass = fillsContainer || stacked ? "w-full" : "inline-flex w-fit max-w-full";

  const statusRow = (
    <div className="flex shrink-0 items-start justify-between gap-2 px-3 py-1.5">
      <span
        className={`shrink-0 rounded-sm border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] ${STATUS_STYLE[post.status]}`}
      >
        {post.status}
      </span>
      <div className="flex min-w-0 items-center gap-2">
        {post.when ? (
          <span className="truncate font-mono text-[0.55rem] uppercase tracking-wide text-muted-foreground">
            {post.when}
          </span>
        ) : null}
        {interactive ? (
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        ) : null}
      </div>
    </div>
  );

  const titleBlock = (
    <div
      className={`min-h-0 flex-1 px-3 pb-1 leading-relaxed text-foreground line-clamp-2 ${
        variant === "compact" ? "text-xs" : "text-sm"
      }`}
    >
      {post.title}
    </div>
  );

  if (stacked) {
    return (
      <div
        data-testid={`post-card-${post.id}`}
        onClick={onClick}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        className={`group flex flex-col overflow-hidden rounded-sm border border-border bg-surface transition-colors ${CARD_PREVIEW_HEIGHT} ${widthClass} ${
          interactive ? "cursor-pointer hover:border-accent" : ""
        } ${className}`}
      >
        <CardMediaBanner src={post.previewUrl} mediaKind={post.mediaKind} alt={post.title} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {statusRow}
          {titleBlock}
          <PlatformRow entries={post.platforms} size="sm" compact />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={`post-card-${post.id}`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`group flex overflow-hidden rounded-sm border border-border bg-surface transition-colors ${CARD_PREVIEW_HEIGHT} ${widthClass} ${
        interactive ? "cursor-pointer hover:border-accent" : ""
      } ${className}`}
    >
      {showMedia ? (
        <CardMediaThumb
          src={post.previewUrl}
          mediaKind={post.mediaKind}
          aspectRatio={aspectRatio}
          alt={post.title}
          size="md"
        />
      ) : null}

      <div
        className={`flex min-h-0 flex-col ${
          fillsContainer ? "min-w-0 flex-1" : `shrink-0 ${contentWidth}`
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2">
          <span
            className={`shrink-0 rounded-sm border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] ${STATUS_STYLE[post.status]}`}
          >
            {post.status}
          </span>
          <div className="flex min-w-0 items-center gap-2">
            {post.when ? (
              <span className="truncate font-mono text-[0.55rem] uppercase tracking-wide text-muted-foreground">
                {post.when}
              </span>
            ) : null}
            {interactive ? (
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            ) : null}
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 px-3 py-2 leading-relaxed text-foreground line-clamp-2 ${
            variant === "compact" ? "text-xs" : "text-sm"
          }`}
        >
          {post.title}
        </div>

        <PlatformRow entries={post.platforms} size="sm" />
      </div>
    </div>
  );
}