import type { ReactNode } from "react";
import { FileVideo, Image as ImageIcon, Play } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import { demoPreviewForPost } from "@/lib/demo-media";
import { inferMediaAspect, inferMediaKind } from "@/lib/scheduled-post-display";
import { cn } from "@/lib/utils";

export type CardThumbnailAspect = "auto" | "video" | "square" | "portrait";

const ASPECT_RATIO: Record<Exclude<CardThumbnailAspect, "auto">, string> = {
  video: "16/9",
  square: "1/1",
  portrait: "9/16",
};

export type CardThumbnailLayout = "rail" | "banner" | "block" | "fixed";

export type CardThumbnailHeight = "sm" | "md";

const RAIL_HEIGHT: Record<CardThumbnailHeight, string> = {
  sm: "h-32",
  md: "h-44",
};

const LAYOUT_CLASS: Record<CardThumbnailLayout, string> = {
  rail: "shrink-0 border-r border-border",
  banner: "h-24 w-full shrink-0 border-b border-border",
  block: "w-full shrink-0 border-b border-border",
  fixed: "h-full w-full",
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
  layout = "rail",
  height = "md",
  className,
}: {
  src?: string;
  post?: Pick<ScheduledPost, "id" | "title"> & { mediaKind?: "image" | "video" };
  alt?: string;
  kind?: "video" | "image";
  aspect?: CardThumbnailAspect;
  badge?: ReactNode;
  layout?: CardThumbnailLayout;
  height?: CardThumbnailHeight;
  className?: string;
}) {
  const title = post?.title ?? alt;
  const mediaKind = kind ?? post?.mediaKind ?? (post ? inferMediaKind(post.title) : "video");
  const imageSrc = src ?? (post ? demoPreviewForPost({ ...post, mediaKind }) : undefined);
  // Use a <video> element only for an actual video source (real upload: blob/object URL, or a
  // video file extension). Demo previews/covers are always poster images and must render as <img>.
  const isVideoSrc =
    !!imageSrc &&
    (imageSrc.startsWith("blob:") ||
      imageSrc.startsWith("data:video") ||
      /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(imageSrc));
  const aspectRatio = layout === "fixed" ? undefined : resolveAspectRatio(aspect, post?.title, mediaKind);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-none border-border bg-background",
        LAYOUT_CLASS[layout],
        layout === "rail" && RAIL_HEIGHT[height],
        layout === "block" && "aspect-video",
        className,
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {isVideoSrc ? (
        <video
          src={imageSrc}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-background/60">
          <MediaFallback kind={mediaKind} />
        </div>
      )}
      {mediaKind === "video" && imageSrc ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/20">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground/30 bg-background/70 shadow-lg backdrop-blur-sm">
            <Play className="h-3 w-3 fill-foreground text-foreground" strokeWidth={0} />
          </span>
        </div>
      ) : null}
      {badge ? <div className="absolute right-2 top-2 z-10">{badge}</div> : null}
    </div>
  );
}