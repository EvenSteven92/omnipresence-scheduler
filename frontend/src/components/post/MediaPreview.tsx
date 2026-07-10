import { Image as ImageIcon, FileVideo, Play } from "lucide-react";

/** Every content-card preview uses the same outer height app-wide. */
export const CARD_PREVIEW_HEIGHT = "h-44";

/** Fixed banner slice inside stacked 16:9 cards — keeps total card height uniform. */
export const CARD_STACKED_BANNER_HEIGHT = "h-24";

const THUMB_HEIGHT = {
  sm: "h-32",
  md: CARD_PREVIEW_HEIGHT,
  lg: CARD_PREVIEW_HEIGHT,
} as const;

export type CardMediaThumbSize = keyof typeof THUMB_HEIGHT;

/** 16:9 landscape — title and platforms stack beneath a full-width preview. */
export function isLandscapeCardAspect(aspectRatio?: string): boolean {
  return (aspectRatio ?? "16/9").replace(":", "/") === "16/9";
}

/** Left-rail layout for day picker — 16:9 and square keep metadata beside the thumb. */
export function usesRailCardLayout(aspectRatio: string, layout: "auto" | "rail"): boolean {
  if (layout === "rail") return true;
  return !isLandscapeCardAspect(aspectRatio);
}

/**
 * Full-width 16:9 banner — used when metadata sits below the image.
 */
export function CardMediaBanner({
  src,
  mediaKind = "video",
  alt,
}: {
  src?: string;
  mediaKind?: "image" | "video" | "none";
  alt: string;
}) {
  if (!src) {
    return (
      <div
        className={`relative flex w-full shrink-0 items-center justify-center overflow-hidden border-b border-border bg-background/60 ${CARD_STACKED_BANNER_HEIGHT}`}
      >
        <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
          {mediaKind === "video" ? (
            <FileVideo className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
          )}
          <span className="text-body-sm text-muted-foreground">No media</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden border-b border-border bg-background ${CARD_STACKED_BANNER_HEIGHT}`}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
      {mediaKind === "video" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/20">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-background/70 shadow-lg backdrop-blur-sm">
            <Play className="h-3 w-3 fill-foreground text-foreground" strokeWidth={0} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Left-rail media thumb — fixed height, width follows aspect ratio.
 * Keeps reel (9:16), square, and landscape proportions without growing the card.
 */
export function CardMediaThumb({
  src,
  mediaKind = "video",
  alt,
  aspectRatio = "16/9",
  size = "md",
}: {
  src?: string;
  mediaKind?: "image" | "video" | "none";
  alt: string;
  aspectRatio?: string;
  size?: CardMediaThumbSize;
}) {
  const heightClass = THUMB_HEIGHT[size];

  if (!src) {
    return (
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden border-r border-border bg-background/60 ${heightClass}`}
        style={{ aspectRatio }}
      >
        <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
          {mediaKind === "video" ? (
            <FileVideo className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
          )}
          <span className="text-body-sm text-muted-foreground">No media</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden border-r border-border bg-background ${heightClass}`}
      style={{ aspectRatio }}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
      {mediaKind === "video" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/20">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-background/70 shadow-lg backdrop-blur-sm">
            <Play className="h-3 w-3 fill-foreground text-foreground" strokeWidth={0} />
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Stacked 16:9 preview — detail modals and legacy full-width layouts. */
export function MediaPreview({
  src,
  mediaKind = "video",
  alt,
}: {
  src?: string;
  mediaKind?: "image" | "video" | "none";
  alt: string;
}) {
  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center border-t border-border bg-background/60">
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          {mediaKind === "video" ? (
            <FileVideo className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
          )}
          <span className="text-body-sm text-muted-foreground">No media asset</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden border-t border-border bg-background">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
      {mediaKind === "video" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/20">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-background/70 shadow-lg backdrop-blur-sm">
            <Play className="h-4 w-4 fill-foreground text-foreground" strokeWidth={0} />
          </span>
        </div>
      ) : null}
    </div>
  );
}
