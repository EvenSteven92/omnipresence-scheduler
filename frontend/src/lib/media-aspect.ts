import type { Platform } from "@/lib/mock-data";
import type { PostFormat } from "@/lib/platforms";
import { PLATFORMS } from "@/lib/platforms";

/**
 * Media aspect buckets for destination gating.
 * Research (2025–26): vertical short-form = 9:16; landscape long-form = 16:9;
 * IG feed prefers 1:1 / 4:5; stories = 9:16.
 */
export type AspectBucket =
  | "portrait_9_16"
  | "portrait_4_5"
  | "square"
  | "classic_4_3"
  | "landscape_16_9";

export type AspectLabel = "9:16" | "4:5" | "1:1" | "4:3" | "16:9";

const LABEL: Record<AspectBucket, AspectLabel> = {
  portrait_9_16: "9:16",
  portrait_4_5: "4:5",
  square: "1:1",
  classic_4_3: "4:3",
  landscape_16_9: "16:9",
};

/** Platforms allowed for each aspect (hard gate). */
const ALLOWED: Record<AspectBucket, Platform[]> = {
  portrait_9_16: ["TIKTOK", "YT SHORTS", "IG", "IG STORY", "FB STORY", "FB"],
  portrait_4_5: ["IG", "FB", "X"],
  square: ["IG", "FB", "X"],
  classic_4_3: ["YT", "RUMBLE", "FB", "X"],
  landscape_16_9: ["YT", "RUMBLE", "FB", "X"],
};

/** Preferred defaults when user has not chosen platforms yet. */
const RECOMMENDED: Record<AspectBucket, Platform[]> = {
  portrait_9_16: ["TIKTOK", "IG", "YT SHORTS"],
  portrait_4_5: ["IG", "FB"],
  square: ["IG", "FB", "X"],
  classic_4_3: ["YT", "FB"],
  landscape_16_9: ["YT", "RUMBLE", "X"],
};

const NEEDS_LABEL: Record<AspectBucket, string> = {
  portrait_9_16: "Needs 9:16 vertical",
  portrait_4_5: "Needs 4:5 portrait",
  square: "Needs 1:1 square",
  classic_4_3: "Needs 4:3 or landscape",
  landscape_16_9: "Needs 16:9 landscape",
};

export function aspectLabel(bucket: AspectBucket): AspectLabel {
  return LABEL[bucket];
}

export function classifyAspect(width: number, height: number): AspectBucket {
  if (!width || !height || width < 1 || height < 1) return "landscape_16_9";
  const r = width / height;
  if (r <= 0.62) return "portrait_9_16";
  if (r <= 0.85) return "portrait_4_5";
  if (r <= 1.15) return "square";
  if (r <= 1.55) return "classic_4_3";
  return "landscape_16_9";
}

export function bucketFromPostFormat(format: PostFormat): AspectBucket {
  if (format === "portrait" || format === "story") return "portrait_9_16";
  return "landscape_16_9";
}

export function postFormatFromBucket(bucket: AspectBucket): PostFormat {
  if (bucket === "portrait_9_16") return "portrait";
  if (bucket === "portrait_4_5") return "portrait";
  return "landscape";
}

export function platformsForAspect(bucket: AspectBucket): Platform[] {
  return [...ALLOWED[bucket]];
}

export function recommendedPlatforms(bucket: AspectBucket): Platform[] {
  return RECOMMENDED[bucket].filter((p) => ALLOWED[bucket].includes(p));
}

export function isPlatformCompatible(platform: Platform, bucket: AspectBucket): boolean {
  return ALLOWED[bucket].includes(platform);
}

export function incompatibilityReason(platform: Platform, bucket: AspectBucket): string {
  if (isPlatformCompatible(platform, bucket)) return "";
  // What would this platform prefer?
  const prefersVertical = (["TIKTOK", "YT SHORTS", "IG STORY", "FB STORY"] as Platform[]).includes(
    platform,
  );
  if (prefersVertical) return "Needs 9:16 vertical";
  if (platform === "IG" && bucket === "landscape_16_9") return "Prefer 9:16 / 4:5 / 1:1";
  return NEEDS_LABEL[bucket] || `Incompatible with ${LABEL[bucket]}`;
}

export function sanitizePlatformsForAspect(
  platforms: Platform[],
  bucket: AspectBucket,
): Platform[] {
  return platforms.filter((p) => isPlatformCompatible(p, bucket));
}

/** Intersection of allowed platforms across multiple cards (bulk schedule). */
export function platformsIntersection(buckets: AspectBucket[]): Platform[] {
  if (buckets.length === 0) return PLATFORMS.map((p) => p.short);
  let set = new Set(platformsForAspect(buckets[0]!));
  for (let i = 1; i < buckets.length; i++) {
    const next = new Set(platformsForAspect(buckets[i]!));
    set = new Set([...set].filter((p) => next.has(p)));
  }
  return [...set];
}

export function humanAspectDescription(bucket: AspectBucket): string {
  switch (bucket) {
    case "portrait_9_16":
      return "9:16 vertical — Reels, Shorts, TikTok, Stories";
    case "portrait_4_5":
      return "4:5 portrait — Instagram & Facebook feed";
    case "square":
      return "1:1 square — Feed posts";
    case "classic_4_3":
      return "4:3 classic — YouTube, Rumble, feed";
    case "landscape_16_9":
      return "16:9 landscape — YouTube, Rumble, X, Facebook";
  }
}

/** Probe image/video file for pixel dimensions. */
export function measureMediaFile(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        URL.revokeObjectURL(url);
        resolve(w && h ? { width: w, height: h } : null);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
      return;
    }
    if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        URL.revokeObjectURL(url);
        resolve(w && h ? { width: w, height: h } : null);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      video.src = url;
      return;
    }
    resolve(null);
  });
}
