import { platformDotColor } from "@/lib/card-display";
import {
  bucketFromPostFormat,
  classifyAspect,
  humanAspectDescription,
  platformGate,
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
 * Destination picker — hard-block only when platform refuses the asset.
 * Soft warnings for preferred ratios (e.g. IG + 16:9).
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
    const gate = platformGate(platform, bucket);
    if (gate.level === "block") return;
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
  const activeWarnings = draft.platforms
    .map((p) => {
      const g = platformGate(p, bucket);
      return g.level === "warn" ? { platform: p, message: g.message } : null;
    })
    .filter(Boolean) as Array<{ platform: Platform; message?: string }>;

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
          const gate = platformGate(meta.short, bucket);
          const blocked = gate.level === "block";
          const warn = gate.level === "warn";
          const active = draft.platforms.includes(meta.short);
          return (
            <button
              key={meta.short}
              type="button"
              disabled={blocked}
              title={gate.message || meta.full}
              onClick={() => toggle(meta.short)}
              data-testid={`dest-${meta.short.replace(/\s+/g, "-")}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-2.5 text-body-sm font-semibold transition-colors duration-150",
                blocked &&
                  "cursor-not-allowed border-line bg-paper-2 text-muted-foreground/50 opacity-60",
                !blocked &&
                  active &&
                  "border-primary bg-primary text-white",
                !blocked &&
                  !active &&
                  "border-line bg-card text-foreground hover:bg-secondary",
                !blocked &&
                  warn &&
                  active &&
                  "ring-1 ring-warning/50",
              )}
            >
              <span
                className="h-2 w-2 rounded-full border border-line"
                style={{
                  background: blocked ? "#ccc" : platformDotColor(meta.short),
                }}
              />
              <span className="flex flex-col items-start leading-tight">
                <span>{meta.full}</span>
                {blocked ? (
                  <span className="text-[0.6rem] font-normal opacity-80">
                    {gate.message}
                  </span>
                ) : warn && !active ? (
                  <span className="text-[0.6rem] font-normal text-warning/90">
                    Preferred ratio differs
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {activeWarnings.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-2">
          {activeWarnings.map((w) => (
            <li key={w.platform} className="text-xs text-foreground">
              <span className="font-semibold">{w.platform}:</span>{" "}
              <span className="text-muted-foreground">{w.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {draft.platforms.length === 0 ? (
        <p className="text-xs text-warning">Select at least one destination.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {draft.platforms.length} destination
          {draft.platforms.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
