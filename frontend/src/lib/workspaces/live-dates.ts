import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { liveDateOffsetMs, shiftIsoByOffset } from "@/lib/demo-clock";
import type { ContentEvent, WorkspaceProfile } from "@/lib/workspaces/types";

function shiftScheduledPost(post: ScheduledPost, offsetMs: number): ScheduledPost {
  const platformTimes = post.platformTimes
    ? (Object.fromEntries(
        Object.entries(post.platformTimes).map(([platform, iso]) => [
          platform,
          shiftIsoByOffset(iso!, offsetMs),
        ]),
      ) as ScheduledPost["platformTimes"])
    : undefined;

  return {
    ...post,
    date: shiftIsoByOffset(post.date, offsetMs),
    platformTimes,
  };
}

function shiftPublishedPost(post: PublishedPost, offsetMs: number): PublishedPost {
  const platformTimes = post.platformTimes
    ? (Object.fromEntries(
        Object.entries(post.platformTimes).map(([platform, iso]) => [
          platform,
          shiftIsoByOffset(iso!, offsetMs),
        ]),
      ) as PublishedPost["platformTimes"])
    : undefined;

  return {
    ...post,
    date: shiftIsoByOffset(post.date, offsetMs),
    platformTimes,
  };
}

function shiftContentEvent(event: ContentEvent, offsetMs: number): ContentEvent {
  return {
    ...event,
    date: shiftIsoByOffset(event.date, offsetMs),
  };
}

/** Re-anchor seeded mock post dates from the demo anchor onto the real calendar. */
export function withLiveDates(workspace: WorkspaceProfile): WorkspaceProfile {
  const offsetMs = liveDateOffsetMs();
  if (offsetMs === 0) return workspace;

  return {
    ...workspace,
    scheduledPosts: workspace.scheduledPosts.map((p) => shiftScheduledPost(p, offsetMs)),
    publishedPosts: workspace.publishedPosts.map((p) => shiftPublishedPost(p, offsetMs)),
    events: workspace.events.map((e) => shiftContentEvent(e, offsetMs)),
  };
}
