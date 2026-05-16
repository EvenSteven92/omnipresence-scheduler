import { Image as ImageIcon, FileVideo, ArrowRight } from "lucide-react";
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
 * Read-only post card — used in Dashboard, Calendar agenda, etc.
 * Always renders: [status chip][title][optional preview][platform row].
 */
export function PostCard({
  post,
  onClick,
  variant = "media",
  className = "",
}: {
  post: DisplayPost;
  onClick?: () => void;
  /** `media` shows a 16:9 preview area; `compact` is just header + platform row. */
  variant?: "media" | "compact";
  className?: string;
}) {
  const interactive = !!onClick;
  return (
    <div
      data-testid={`post-card-${post.id}`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`group flex flex-col overflow-hidden rounded-sm border border-border bg-surface transition-colors ${
        interactive ? "cursor-pointer hover:border-accent" : ""
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-2">
        <span
          className={`shrink-0 rounded-sm border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] ${STATUS_STYLE[post.status]}`}
        >
          {post.status}
        </span>
        {post.when && (
          <span className="font-mono text-[0.6rem] uppercase tracking-wide text-muted-foreground">
            {post.when}
          </span>
        )}
        {interactive && (
          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        )}
      </div>

      {/* Title */}
      <div className="px-3 pt-2 pb-2 text-sm leading-snug text-foreground line-clamp-2">
        {post.title}
      </div>

      {/* Preview placeholder */}
      {variant === "media" && (
        <div className="flex aspect-video items-center justify-center border-t border-border bg-background/60">
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            {post.mediaKind === "video" ? (
              <FileVideo className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
            )}
            <span className="label-mono text-[0.55rem]">no_media_asset</span>
          </div>
        </div>
      )}

      {/* Platform footer — universal */}
      <PlatformRow entries={post.platforms} size="sm" />
    </div>
  );
}
