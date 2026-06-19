import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";

export type CalendarDayClickResult =
  | { action: "empty"; date: Date }
  | { action: "mixed"; date: Date; events: ContentEvent[]; posts: ScheduledPost[] }
  | { action: "posts"; date: Date; posts: ScheduledPost[] }
  | { action: "singleEvent"; event: ContentEvent }
  | { action: "multiEvent"; date: Date; events: ContentEvent[] };

export function resolveCalendarDayClick(
  date: Date,
  events: ContentEvent[],
  posts: ScheduledPost[],
): CalendarDayClickResult {
  const hasEvents = events.length > 0;
  const hasPosts = posts.length > 0;

  if (hasEvents && hasPosts) {
    return { action: "mixed", date, events, posts };
  }
  if (hasEvents) {
    if (events.length === 1) return { action: "singleEvent", event: events[0]! };
    return { action: "multiEvent", date, events };
  }
  if (hasPosts) {
    return { action: "posts", date, posts };
  }
  return { action: "empty", date };
}

export function toCalendarDateSearch(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseCalendarDateSearch(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(+date)) return null;
  return date;
}
