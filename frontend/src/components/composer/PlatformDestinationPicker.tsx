import { platformDotColor } from "@/lib/card-display";
import {
  bucketFromPostFormat,
  classifyAspect,
  humanAspectDescription,
  incompatibilityReason,
  isPlatformCompatible,
  recommendedPlatforms,
  type AspectBucket,
} from "@/lib/media-aspect";
import type { Platform } from "@/lib/mock-data";
import { PLATFORMS } from "@/lib/platforms";
import type { DraftPost } from "@/lib/composer-draft";
import { cn } from "@/lib/utils";

export function resolveAspectBucket(draft: DraftPost): AspectBucket {
  if (draft.aspectBucket) return draft.aspectBucket;
  if (draft.width && draft.height) {
    return classifyAspect(draft.width, draft.height);
  }
  return bucketFromPostFormat(draft.format);
}

/**
 * Schedule-page platform picker — only compatible destinations are selectable.
 */
export function PlatformDestinationPicker({
  draft,
  workspacePlatforms,
  onChange,
}: {
  draft: DraftPost;
  workspacePlatforms: Platform[];
  onChange: (platforms: Platform[]) => void;
}) {
  const bucket = resolveAspectBucket(draft);
  const label = draft.aspectLabel ?? "—";
  const recommended = recommendedPlatforms(bucket).filter((p) =>
    workspacePlatforms.includes(p),
  );

  function toggle(platform: Platform) {
    if (!isPlatformCompatible(platform, bucket)) return;
    const has = draft.platforms.includes(platform);
    const next = has
      ? draft.platforms.filter((p) => p !== platform)
      : [...draft.platforms, platform];
    onChange(next);
  }

  function applyRecommended() {
    onChange(recommended);
  }

  const catalog = PLATFORMS.filter((p) => workspacePlatforms.includes(p.short));

  return (
    <div data-testid="platform-destination-picker" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Destinations
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Media is{" "}
            <span className="font-semibold text-foreground">{label}</span>
            {" — "}
            {humanAspectDescription(bucket)}
          </p>
        </div>
        <button
          type="button"
          onClick={applyRecommended}
          className="rounded-md border border-line bg-card px-2.5 py-1.5 text-caption font-medium text-foreground hover:bg-secondary"
        >
          Use recommended
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {catalog.map((meta) => {
          const ok = isPlatformCompatible(meta.short, bucket);
          const active = draft.platforms.includes(meta.short);
          const reason = ok ? "" : incompatibilityReason(meta.short, bucket);
          return (
            <button
              key={meta.short}
              type="button"
              disabled={!ok}
              title={reason || meta.full}
              onClick={() => toggle(meta.short)}
              data-testid={`dest-${meta.short.replace(/\s+/g, "-")}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-2.5 text-body-sm font-semibold transition-colors",
                !ok &&
                  "cursor-not-allowed border-line bg-paper-2 text-muted-foreground/50 opacity-60",
                ok &&
                  active &&
                  "border-foreground bg-foreground text-white",
                ok &&
                  !active &&
                  "border-line bg-card text-foreground hover:bg-secondary",
              )}
            >
              <span
                className="h-2 w-2 rounded-full border border-foreground/20"
                style={{ background: ok ? platformDotColor(meta.short) : "#ccc" }}
              />
              <span className="flex flex-col items-start leading-tight">
                <span>{meta.full}</span>
                {!ok ? (
                  <span className="text-[0.6rem] font-normal opacity-80">{reason}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {draft.platforms.length === 0 ? (
        <p className="text-xs text-warning">Select at least one compatible platform.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {draft.platforms.length} destination{draft.platforms.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
