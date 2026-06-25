import type { ReactNode } from "react";
import { FileVideo, Image as ImageIcon, Play } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import { demoPreviewForPost } from "@/lib/demo-media";
import { inferMediaAspect, inferMediaKind } from "@/lib/scheduled-post-display";
import { streamCardGradient, type CardMediaType } from "@/lib/card-display";
import { cn } from "@/lib/utils";

export type CardThumbnailAspect = "auto" | "video" | "square" | "portrait";

const ASPECT_RATIO: Record<Exclude<CardThumbnailAspect, "auto">, string> = {
  video: "16/9",
  square: "1/1",
  portrait: "9/16",
};

export type CardThumbnailLayout = "rail" | "banner" | "block" | "fixed" | "square";

export type CardThumbnailHeight = "sm" | "md" | "stream";

const RAIL_HEIGHT: Record<CardThumbnailHeight, string> = {
  sm: "h-32",
  md: "h-44",
  stream: "h-[86px] w-[86px]",
};

const LAYOUT_CLASS: Record<CardThumbnailLayout, string> = {
  rail: "shrink-0 border-r-[1.5px] border-foreground",
  banner: "h-24 w-full shrink-0 border-b-[1.5px] border-foreground",
  block: "w-full shrink-0 border-b-[1.5px] border-foreground",
  fixed: "h-full w-full",
  square: "h-[86px] w-[86px] shrink-0 overflow-hidden rounded-md border-[1.5px] border-foreground",
};

function resolveAspectRatio(
  aspect: CardThumbnailAspect,
  title?: string,
  mediaKind?: "image" | "video",
): string {
  if (aspect !== "auto") return ASPECT_RATIO[aspect];
  if (!title) return "16/9";
  return inferMediaAspect(title, mediaKind);
}

function MediaFallback({ kind }: { kind: "image" | "video" }) {
  return (
    <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
      {kind === "video" ? (
        <FileVideo className="h-4 w-4" strokeWidth={1.5} />
      ) : (
        <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
      )}
      <span className="text-body-sm text-muted-foreground">No media</span>
    </div>
  );
}

export function CardThumbnail({
  src,
  post,
  alt = "",
  kind,
  aspect = "auto",
  badge,
  mediaType,
  layout = "rail",
  height = "md",
  className,
  variant = "media",
}: {
  src?: string;
  post?: Pick<ScheduledPost, "id" | "title"> & { mediaKind?: "image" | "video" };
  alt?: string;
  kind?: "video" | "image";
  aspect?: CardThumbnailAspect;
  badge?: ReactNode;
  mediaType?: CardMediaType;
  layout?: CardThumbnailLayout;
  height?: CardThumbnailHeight;
  className?: string;
  /** `gradient` — solid color blocks like the Claude Design queue cards. */
  variant?: "media" | "gradient";
}) {
  const title = post?.title ?? alt;
  const mediaKind = kind ?? post?.mediaKind ?? (post ? inferMediaKind(post.title) : "video");
  const useGradient = variant === "gradient" && post;
  const imageSrc =
    useGradient ? undefined : src ?? (post ? demoPreviewForPost({ ...post, mediaKind }) : undefined);
  const gradientStyle = useGradient ? { background: streamCardGradient(post) } : undefined;
  const aspectRatio =
    layout === "fixed" || layout === "square" ? undefined : resolveAspectRatio(aspect, post?.title, mediaKind);
  const typeLabel = mediaType ?? (mediaKind === "video" ? "VIDEO" : "IMAGE");

  const isSquare = layout === "square";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-background",
        !isSquare && "rounded-none",
        isSquare && "rounded-md",
        LAYOUT_CLASS[layout],
        layout === "rail" && RAIL_HEIGHT[height],
        layout === "block" && "aspect-video",
        className,
      )}
      style={{ ...(aspectRatio ? { aspectRatio } : {}), ...gradientStyle }}
    >
      {useGradient ? null : imageSrc && mediaKind === "video" ? (
        <video
          src={imageSrc}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : imageSrc ? (
        <img src={imageSrc} alt={title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-paper-2/60">
          <MediaFallback kind={mediaKind} />
        </div>
      )}
      {mediaKind === "video" && (useGradient || imageSrc) ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] border-foreground bg-white/85 shadow-sm">
            <Play className="h-3 w-3 fill-foreground text-foreground" strokeWidth={0} />
          </span>
        </div>
      ) : null}
      {isSquare ? (
        <span className="absolute bottom-0 left-0 bg-foreground px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase leading-none tracking-[0.06em] text-background">
          {typeLabel}
        </span>
      ) : null}
      {badge ? <div className="absolute right-2 top-2 z-10">{badge}</div> : null}
    </div>
  );
}