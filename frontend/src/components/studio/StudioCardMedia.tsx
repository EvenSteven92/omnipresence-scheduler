import { Play, X } from "lucide-react";
import { useState } from "react";
import type { DraftPost } from "@/lib/composer-draft";
import { demoPreviewForPost } from "@/lib/demo-media";
import { mediaAspectRatioCss } from "@/lib/studio-layout";
import { cn } from "@/lib/utils";

/**
 * Media frame follows the file’s aspect ratio (object-contain — no forced 9:16 crop).
 */
export function StudioCardMedia({
  draft,
  className,
}: {
  draft: DraftPost;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const src = draft.previewUrl || draft.dropboxDirectUrl;
  const poster = src || demoPreviewForPost({ id: draft.id, title: draft.filename });
  const isVideo = draft.mediaKind === "video";
  const aspectRatio = mediaAspectRatioCss(draft);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-t-lg bg-[#0a0a0a]",
        className,
      )}
      style={{ aspectRatio, maxHeight: 320 }}
    >
      {isVideo && src && playing ? (
        <video
          src={src}
          className="h-full w-full object-contain"
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          {isVideo && src ? (
            <video
              src={src}
              className="h-full w-full object-contain"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={poster}
              alt=""
              className="h-full w-full object-contain"
            />
          )}
          {isVideo && src ? (
            <button
              type="button"
              data-testid={`studio-play-${draft.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setPlaying(true);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
              aria-label="Play preview"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-black/50 text-white backdrop-blur-sm">
                <Play className="h-5 w-5 fill-white" strokeWidth={0} />
              </span>
            </button>
          ) : null}
        </>
      )}
      {playing ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPlaying(false);
          }}
          className="absolute right-2 top-2 rounded-md border border-white/30 bg-black/60 p-1 text-white"
          aria-label="Close preview"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
