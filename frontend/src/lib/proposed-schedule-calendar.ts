import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import type { ScheduledPost } from "@/lib/mock-data";
import { contentCardAnchorIso } from "@/lib/scheduled-post-display";
import { toDateInputValue } from "@/lib/schedule-engine";

/** Local calendar day key YYYY-MM-DD */
export function dayKeyFromDate(date: Date): string {
  return toDateInputValue(date);
}

export function dayKeyFromIso(iso: string): string {
  return dayKeyFromDate(new Date(iso));
}

/**
 * Unique local days this card will appear on (one entry per day,
 * even if multiple platforms post that day).
 */
export function uniquePublishDays(draft: DraftPost): string[] {
  const times = draft.proposedTimes ?? {};
  const keys = new Set<string>();
  for (const iso of Object.values(times)) {
    if (iso) keys.add(dayKeyFromIso(iso));
  }
  return [...keys].sort();
}

/** Earliest ISO on a given day for this draft (for subtle “from 9am” labels). */
export function earliestIsoOnDay(draft: DraftPost, dayKey: string): string | null {
  const times = draft.proposedTimes ?? {};
  let best: string | null = null;
  for (const iso of Object.values(times)) {
    if (!iso) continue;
    if (dayKeyFromIso(iso) !== dayKey) continue;
    if (!best || +new Date(iso) < +new Date(best)) best = iso;
  }
  return best;
}

/** Sort cards on a day by earliest proposed time that day (stable by id). */
export function sortDraftsOnDay(drafts: DraftPost[], dayKey: string): DraftPost[] {
  return [...drafts].sort((a, b) => {
    const aIso = earliestIsoOnDay(a, dayKey);
    const bIso = earliestIsoOnDay(b, dayKey);
    const aT = aIso ? +new Date(aIso) : Number.POSITIVE_INFINITY;
    const bT = bIso ? +new Date(bIso) : Number.POSITIVE_INFINITY;
    if (aT !== bT) return aT - bT;
    return a.id.localeCompare(b.id);
  });
}

export function groupDraftsByDay(drafts: DraftPost[]): Map<string, DraftPost[]> {
  const map = new Map<string, DraftPost[]>();
  for (const draft of drafts) {
    for (const key of uniquePublishDays(draft)) {
      const arr = map.get(key) ?? [];
      // once per day per card
      if (!arr.some((d) => d.id === draft.id)) arr.push(draft);
      map.set(key, arr);
    }
  }
  map.forEach((arr, key) => {
    map.set(key, sortDraftsOnDay(arr, key));
  });
  return map;
}

export function draftsOnDay(drafts: DraftPost[], date: Date): DraftPost[] {
  const key = dayKeyFromDate(date);
  return groupDraftsByDay(drafts).get(key) ?? [];
}

/**
 * Committed (already scheduled) posts on a local day.
 * Uses anchor (earliest platform) time — one chip per content card.
 */
export function uniqueCommittedDays(post: ScheduledPost): string[] {
  const times = post.platformTimes;
  if (times && Object.keys(times).length > 0) {
    const keys = new Set<string>();
    for (const iso of Object.values(times)) {
      if (iso) keys.add(dayKeyFromIso(iso));
    }
    if (keys.size > 0) return [...keys].sort();
  }
  return [dayKeyFromIso(contentCardAnchorIso(post))];
}

export function earliestCommittedIsoOnDay(
  post: ScheduledPost,
  dayKey: string,
): string | null {
  const times = post.platformTimes;
  let best: string | null = null;
  if (times) {
    for (const iso of Object.values(times)) {
      if (!iso) continue;
      if (dayKeyFromIso(iso) !== dayKey) continue;
      if (!best || +new Date(iso) < +new Date(best)) best = iso;
    }
  }
  if (best) return best;
  const anchor = contentCardAnchorIso(post);
  return dayKeyFromIso(anchor) === dayKey ? anchor : null;
}

export function sortCommittedOnDay(
  posts: ScheduledPost[],
  dayKey: string,
): ScheduledPost[] {
  return [...posts].sort((a, b) => {
    const aIso = earliestCommittedIsoOnDay(a, dayKey);
    const bIso = earliestCommittedIsoOnDay(b, dayKey);
    const aT = aIso ? +new Date(aIso) : Number.POSITIVE_INFINITY;
    const bT = bIso ? +new Date(bIso) : Number.POSITIVE_INFINITY;
    if (aT !== bT) return aT - bT;
    return a.id.localeCompare(b.id);
  });
}

export function groupCommittedByDay(
  posts: ScheduledPost[],
): Map<string, ScheduledPost[]> {
  const map = new Map<string, ScheduledPost[]>();
  for (const post of posts) {
    if (post.status === "published") continue;
    for (const key of uniqueCommittedDays(post)) {
      const arr = map.get(key) ?? [];
      if (!arr.some((p) => p.id === post.id)) arr.push(post);
      map.set(key, arr);
    }
  }
  map.forEach((arr, key) => {
    map.set(key, sortCommittedOnDay(arr, key));
  });
  return map;
}

export function committedOnDay(
  posts: ScheduledPost[],
  date: Date,
): ScheduledPost[] {
  const key = dayKeyFromDate(date);
  return groupCommittedByDay(posts).get(key) ?? [];
}

export function unscheduledDrafts(drafts: DraftPost[]): DraftPost[] {
  return drafts.filter((d) => uniquePublishDays(d).length === 0);
}

/** Human summary for batch agenda: "Mon 9 · Tue 11" */
export function formatDaysSummary(draft: DraftPost): string {
  const days = uniquePublishDays(draft);
  if (days.length === 0) return "No times yet";
  return days
    .map((k) => {
      const d = new Date(k + "T12:00:00");
      return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    })
    .join(" · ");
}

export function cardAgendaRows(drafts: DraftPost[]): Array<{
  draft: DraftPost;
  title: string;
  daysLabel: string;
  dayCount: number;
  ready: boolean;
}> {
  return drafts.map((draft) => {
    const days = uniquePublishDays(draft);
    return {
      draft,
      title: draftDisplayTitle(draft),
      daysLabel: formatDaysSummary(draft),
      dayCount: days.length,
      ready: days.length > 0 && draft.platforms.length > 0,
    };
  });
}
