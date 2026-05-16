import { scheduledPosts } from "@/lib/mock-data";
import type { Platform } from "@/lib/mock-data";

const CONFLICT_WINDOW_MS = 15 * 60 * 1000; // ±15 min

export interface Conflict {
  withId: string;
  withTitle: string;
  withDate: string;
  sharedPlatforms: Platform[];
  deltaMinutes: number;
}

/**
 * Detects scheduling conflicts within ±15 minutes that share at least one platform.
 * @returns array of conflicts (empty if none)
 */
export function detectConflicts(
  candidateDate: Date,
  candidatePlatforms: Platform[],
  excludeId?: string,
): Conflict[] {
  const candidateMs = candidateDate.getTime();
  const out: Conflict[] = [];
  for (const p of scheduledPosts) {
    if (excludeId && p.id === excludeId) continue;
    const ms = new Date(p.date).getTime();
    const delta = Math.abs(ms - candidateMs);
    if (delta > CONFLICT_WINDOW_MS) continue;
    const shared = p.platforms.filter((pl) => candidatePlatforms.includes(pl));
    if (shared.length === 0) continue;
    out.push({
      withId: p.id,
      withTitle: p.title,
      withDate: p.date,
      sharedPlatforms: shared,
      deltaMinutes: Math.round(delta / 60_000),
    });
  }
  return out;
}
