import type { Platform } from "@/lib/mock-data";
import type { PostFormat } from "@/lib/platforms";
import { PLATFORMS } from "@/lib/platforms";

/**
 * Media aspect buckets for destination gating.
 * Soft warn vs hard block — only block when the platform will refuse the asset.
 */
export type AspectBucket =
  | "portrait_9_16"
  | "portrait_4_5"
  | "square"
  | "classic_4_3"
  | "landscape_16_9";

export type AspectLabel = "9:16" | "4:5" | "1:1" | "4:3" | "16:9";

export type GateLevel = "allowed" | "warn" | "block";

export type PlatformGate = {
  level: GateLevel;
  message?: string;
};

const LABEL: Record<AspectBucket, AspectLabel> = {
  portrait_9_16: "9:16",
  portrait_4_5: "4:5",
  square: "1:1",
  classic_4_3: "4:3",
  landscape_16_9: "16:9",
};

/** Preferred defaults when user has not chosen platforms yet. */
const RECOMMENDED: Record<AspectBucket, Platform[]> = {
  portrait_9_16: ["TIKTOK", "IG", "YT SHORTS"],
  portrait_4_5: ["IG", "FB"],
  square: ["IG", "FB", "X"],
  classic_4_3: ["YT", "FB"],
  landscape_16_9: ["YT", "RUMBLE", "X", "IG", "FB"],
};

const PREFERRED: Record<AspectBucket, Platform[]> = {
  portrait_9_16: ["TIKTOK", "YT SHORTS", "IG", "IG STORY", "FB STORY", "FB"],
  portrait_4_5: ["IG", "FB", "X"],
  square: ["IG", "FB", "X"],
  classic_4_3: ["YT", "RUMBLE", "FB", "X"],
  landscape_16_9: ["YT", "RUMBLE", "X", "FB"],
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

/**
 * Soft vs hard gate.
 * - block: platform will not accept (e.g. Shorts need 9:16)
 * - warn: accepted but not preferred (e.g. IG + 16:9)
 * - allowed: preferred fit
 */
export function platformGate(platform: Platform, bucket: AspectBucket): PlatformGate {
  // Hard: vertical-only platforms refuse non-9:16
  if (
    (platform === "YT SHORTS" || platform === "TIKTOK") &&
    bucket !== "portrait_9_16"
  ) {
    return {
      level: "block",
      message:
        platform === "YT SHORTS"
          ? "YouTube Shorts requires 9:16 vertical"
          : "TikTok requires 9:16 vertical",
    };
  }
  if (
    (platform === "IG STORY" || platform === "FB STORY") &&
    bucket !== "portrait_9_16"
  ) {
    return { level: "block", message: "Stories require 9:16 vertical" };
  }

  // Soft: IG accepts landscape/square variants with preferred ratios
  if (platform === "IG") {
    if (bucket === "landscape_16_9" || bucket === "classic_4_3") {
      return {
        level: "warn",
        message: "Preferred 4:5 / 1:1 / 9:16 — 16:9 may letterbox or crop in feed",
      };
    }
    if (bucket === "square" || bucket === "portrait_4_5" || bucket === "portrait_9_16") {
      return { level: "allowed" };
    }
  }

  // FB / X accept most ratios with mild preference
  if ((platform === "FB" || platform === "X") && bucket === "portrait_9_16") {
    return { level: "warn", message: "Works, but feed often prefers 4:5 or 1:1" };
  }

  // YT / Rumble prefer landscape
  if (
    (platform === "YT" || platform === "RUMBLE") &&
    (bucket === "portrait_9_16" || bucket === "portrait_4_5")
  ) {
    return {
      level: "warn",
      message: "Long-form prefers 16:9 — vertical may pillarbox",
    };
  }

  if (PREFERRED[bucket]?.includes(platform)) {
    return { level: "allowed" };
  }

  // Default: allow with soft notice rather than block
  return {
    level: "warn",
    message: `Preferred ratio differs from ${LABEL[bucket]} — platform may still accept`,
  };
}

/** Selectable if not hard-blocked. */
export function isPlatformCompatible(platform: Platform, bucket: AspectBucket): boolean {
  return platformGate(platform, bucket).level !== "block";
}

export function incompatibilityReason(platform: Platform, bucket: AspectBucket): string {
  const g = platformGate(platform, bucket);
  if (g.level === "allowed") return "";
  return g.message ?? "";
}

/** Platforms that are not hard-blocked for this aspect. */
export function platformsForAspect(bucket: AspectBucket): Platform[] {
  return PLATFORMS.map((p) => p.short).filter((p) => isPlatformCompatible(p, bucket));
}

export function recommendedPlatforms(bucket: AspectBucket): Platform[] {
  return RECOMMENDED[bucket].filter((p) => isPlatformCompatible(p, bucket));
}

export function sanitizePlatformsForAspect(
  platforms: Platform[],
  bucket: AspectBucket,
): Platform[] {
  return platforms.filter((p) => isPlatformCompatible(p, bucket));
}

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
      return "16:9 landscape — YouTube, Rumble, X, Facebook · IG accepts with notice";
  }
}

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
