import type { Platform } from "@/lib/mock-data";

/** Human-readable slot for platform rows and calendar chips. */
export function formatScheduleAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatScheduleTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export interface PlatformSlot {
  platform: Platform;
  at: string;
  iso: string;
}

/** Build sorted platform + time rows from a partial map or single fallback date. */
export function buildPlatformSlots(
  platforms: Platform[],
  times?: Partial<Record<Platform, string>>,
  fallbackIso?: string,
): PlatformSlot[] {
  return platforms
    .map((platform) => {
      const iso = times?.[platform] ?? fallbackIso;
      if (!iso) return null;
      return {
        platform,
        iso,
        at: formatScheduleAt(iso),
      };
    })
    .filter((x): x is PlatformSlot => x != null)
    .sort((a, b) => +new Date(a.iso) - +new Date(b.iso));
}
