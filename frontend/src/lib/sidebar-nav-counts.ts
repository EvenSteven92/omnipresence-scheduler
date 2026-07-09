import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { todayStart } from "@/lib/demo-clock";
import {
  contentCardAnchorDate,
  getUpcomingContentCards,
  UPCOMING_WINDOW_DAYS,
} from "@/lib/scheduled-post-display";

export type SidebarNavCountKey = "queue" | "calendar" | "events";

export function computeSidebarNavCounts(
  scheduledPosts: ScheduledPost[],
  events: ContentEvent[],
  fromDay = todayStart(),
): Record<SidebarNavCountKey, number> {
  const upcoming = getUpcomingContentCards(scheduledPosts, fromDay, UPCOMING_WINDOW_DAYS);
  const queueDays = new Set(upcoming.map((p) => contentCardAnchorDate(p).toDateString()));

  return {
    queue: upcoming.length,
    calendar: queueDays.size,
    events: events.length,
  };
}
