import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { demoCoverForEventKind, demoPreviewForPost } from "@/lib/demo-media";
import type { DraftPost } from "@/components/post/ComposerCard";
import { isSameCalendarDay } from "@/lib/demo-clock";
import { contentCardAnchorDate, inferMediaAspect } from "@/lib/scheduled-post-display";
import type { Timeframe } from "@/lib/timeframe";
import { filterEventsInTimeframe } from "@/lib/timeframe";
import type { ContentEvent, WorkspaceProfile } from "@/lib/workspaces/types";
export type EventMediaStatus = "draft" | "scheduled" | "published";

export interface EventMediaItem {
  id: string;
  title: string;
  filename?: string;
  status: EventMediaStatus;
  mediaKind?: "image" | "video";
  platforms: ScheduledPost["platforms"];
  date?: string;
  views?: number;
  likes?: number;
  shares?: number;
  engagementRate?: number;
}

export interface EventPerformance {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  avgEngagement: number;
  publishedCount: number;
  scheduledCount: number;
  draftCount: number;
  mediaCount: number;
}

const KIND_LABELS: Record<ContentEvent["kind"], string> = {
  sunday_sermon: "Sunday sermon",
  worship_night: "Worship night",
  youth: "Youth",
  campaign: "Campaign",
  conference: "Conference",
  other: "Other",
};

export function eventKindLabel(kind: ContentEvent["kind"]): string {
  return KIND_LABELS[kind];
}

export type EventDateStyle = "long" | "medium" | "short";

export function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatEventDate(iso: string, style: EventDateStyle = "medium"): string {
  const d = new Date(iso);
  if (style === "long") {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (style === "short") {
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventDateTime(iso: string, style: EventDateStyle = "medium"): string {
  return `${formatEventDate(iso, style)} · ${formatEventTime(iso)}`;
}

export function formatEventMeta(iso: string, kind: ContentEvent["kind"]): string {
  return `${eventKindLabel(kind)} · ${formatEventTime(iso)}`;
}

export function getEventById(events: ContentEvent[], eventId: string): ContentEvent | undefined {
  return events.find((e) => e.id === eventId);
}

/** Event albums landing on a specific calendar day (local). */
export function getEventsOnCalendarDay(events: ContentEvent[], date: Date): ContentEvent[] {
  return events
    .filter((event) => isSameCalendarDay(new Date(event.date), date))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

/** Group event albums by calendar day using each event's anchor date. */
export function groupEventsByCalendarDay(
  events: ContentEvent[],
  year: number,
  month: number,
): Map<number, ContentEvent[]> {
  const map = new Map<number, ContentEvent[]>();
  events.forEach((event) => {
    const dt = new Date(event.date);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate();
      const arr = map.get(day) ?? [];
      arr.push(event);
      map.set(day, arr);
    }
  });
  map.forEach((arr) => arr.sort((a, b) => +new Date(a.date) - +new Date(b.date)));
  return map;
}

function postBelongsToEvent(
  post: Pick<ScheduledPost, "id" | "eventId">,
  eventId: string,
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined,
): boolean {
  const linked = resolveEventId ? resolveEventId(post) : post.eventId;
  return linked === eventId;
}

/** Scheduled content cards linked to an event that are not live yet. */
export function queuedPostsForEvent(
  posts: ScheduledPost[],
  eventId: string,
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined,
): ScheduledPost[] {
  return posts
    .filter(
      (post) => post.status === "scheduled" && postBelongsToEvent(post, eventId, resolveEventId),
    )
    .sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b));
}

export interface DayPostsEventGroup {
  event: ContentEvent | null;
  posts: ScheduledPost[];
}

/** Bucket day-grid cards under their event album; unlinked cards last. */
export function groupDayPostsByEvent(
  posts: ScheduledPost[],
  events: ContentEvent[],
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined,
): DayPostsEventGroup[] {
  const byEventId = new Map<string, ScheduledPost[]>();
  const unassigned: ScheduledPost[] = [];

  for (const post of posts) {
    const eventId = resolveEventId ? resolveEventId(post) : post.eventId;
    if (!eventId) {
      unassigned.push(post);
      continue;
    }
    const arr = byEventId.get(eventId) ?? [];
    arr.push(post);
    byEventId.set(eventId, arr);
  }

  const groups: DayPostsEventGroup[] = [];
  const sortedEventIds = [...byEventId.keys()].sort((a, b) => {
    const evA = getEventById(events, a);
    const evB = getEventById(events, b);
    return +new Date(evA?.date ?? 0) - +new Date(evB?.date ?? 0);
  });

  for (const eventId of sortedEventIds) {
    const eventPosts = byEventId.get(eventId)!;
    const event = getEventById(events, eventId) ?? {
      id: eventId,
      title: eventId,
      date: eventPosts[0]!.date,
      kind: "other" as const,
    };
    groups.push({ event, posts: eventPosts });
  }

  if (unassigned.length > 0) {
    groups.push({ event: null, posts: unassigned });
  }

  return groups;
}

export function collectEventMedia(
  workspace: WorkspaceProfile,
  eventId: string,
  options: {
    extraDrafts?: DraftPost[];
    resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  } = {},
): EventMediaItem[] {
  const { extraDrafts = [], resolveEventId } = options;
  const items: EventMediaItem[] = [];

  workspace.scheduledPosts
    .filter((p) => postBelongsToEvent(p, eventId, resolveEventId))
    .forEach((p) => {
      items.push({
        id: p.id,
        title: p.title,
        status: p.status === "draft" ? "draft" : "scheduled",
        platforms: p.platforms,
        date: p.date,
      });
    });

  workspace.publishedPosts
    .filter((p) => postBelongsToEvent(p, eventId, resolveEventId))
    .forEach((p) => {
      items.push({
        id: p.id,
        title: p.title,
        status: "published",
        platforms: p.platforms,
        date: p.date,
        views: p.views,
        likes: p.likes,
        shares: p.shares,
        engagementRate: p.engagementRate,
      });
    });

  extraDrafts
    .filter((d) => d.eventId === eventId)
    .forEach((d) => {
      items.push({
        id: d.id,
        title: d.filename,
        filename: d.filename,
        status: "draft",
        mediaKind: d.mediaKind,
        platforms: d.platforms,
      });
    });

  return items.sort((a, b) => {
    const rank = { scheduled: 0, published: 1, draft: 2 };
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    if (a.date && b.date) return +new Date(b.date) - +new Date(a.date);
    return a.title.localeCompare(b.title);
  });
}

export function eventMediaCount(workspace: WorkspaceProfile, eventId: string): number {
  return collectEventMedia(workspace, eventId).length;
}

export function computeEventPerformance(items: EventMediaItem[]): EventPerformance {
  const published = items.filter((i) => i.status === "published");
  const scheduled = items.filter((i) => i.status === "scheduled");
  const draft = items.filter((i) => i.status === "draft");

  const totalViews = published.reduce((s, i) => s + (i.views ?? 0), 0);
  const totalLikes = published.reduce((s, i) => s + (i.likes ?? 0), 0);
  const totalShares = published.reduce((s, i) => s + (i.shares ?? 0), 0);
  const avgEngagement =
    published.length > 0
      ? published.reduce((s, i) => s + (i.engagementRate ?? 0), 0) / published.length
      : 0;

  return {
    totalViews,
    totalLikes,
    totalShares,
    avgEngagement,
    publishedCount: published.length,
    scheduledCount: scheduled.length,
    draftCount: draft.length,
    mediaCount: items.length,
  };
}

function inferMediaKind(item: EventMediaItem): "image" | "video" {
  if (item.mediaKind) return item.mediaKind;
  const t = item.title.toLowerCase();
  if (t.includes("quote") || t.includes("carousel") || t.includes("photo")) return "image";
  return "video";
}

export function eventToDisplayPost(item: EventMediaItem) {
  const mediaKind = inferMediaKind(item);
  const entries =
    item.status === "published"
      ? item.platforms.map((p) => ({ platform: p, state: "published" as const }))
      : item.status === "scheduled"
        ? item.platforms.map((p) => ({ platform: p, state: "scheduled" as const }))
        : item.platforms.map((p) => ({ platform: p, state: "pending" as const }));

  return {
    id: item.id,
    title: item.title,
    status: item.status,
    when: item.date
      ? new Date(item.date).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          ...(item.status === "published" ? {} : { hour: "numeric", minute: "2-digit" }),
        })
      : undefined,
    mediaKind,
    aspectRatio: inferMediaAspect(item.title, mediaKind),
    previewUrl: demoPreviewForPost({ id: item.id, title: item.title, mediaKind }),
    platforms: entries,
  };
}

/** Album grid cards — schedule details live in the post detail modal. */
export function eventToAlbumDisplayPost(item: EventMediaItem) {
  const { when: _when, ...rest } = eventToDisplayPost(item);
  return rest;
}

/** Cover image for event album cards — lead media or kind-based stock art. */
export function eventAlbumCover(
  workspace: WorkspaceProfile,
  event: ContentEvent,
  options: {
    resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  } = {},
): { src: string; alt: string } {
  const media = collectEventMedia(workspace, event.id, options);
  const topPublished = [...media]
    .filter((item) => item.status === "published")
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
  const lead =
    topPublished ??
    media.find((item) => item.status === "scheduled") ??
    media.find((item) => item.status === "draft");

  if (lead) {
    const mediaKind = inferMediaKind(lead);
    return {
      src: demoPreviewForPost({ id: lead.id, title: lead.title, mediaKind }),
      alt: lead.title,
    };
  }

  return {
    src: demoCoverForEventKind(event.kind),
    alt: event.title,
  };
}

/** Map album media items onto ContentCardChip's scheduled-post shape. */
export function eventMediaToCardPost(item: EventMediaItem): ScheduledPost {
  return {
    id: item.id,
    title: item.title,
    platforms: item.platforms,
    date: item.date ?? new Date(0).toISOString(),
    status:
      item.status === "published" ? "published" : item.status === "draft" ? "draft" : "scheduled",
  };
}

export interface RankedEventPerformer {
  event: ContentEvent;
  perf: EventPerformance;
  leadMedia?: EventMediaItem;
}

/** Map ranked event performers onto ContentCardChip — event title, lead live media preview. */
export function eventPerformerToCardPost(row: RankedEventPerformer): ScheduledPost {
  const { event, leadMedia } = row;
  if (leadMedia) {
    return {
      ...eventMediaToCardPost(leadMedia),
      title: event.title,
    };
  }
  return {
    id: event.id,
    title: event.title,
    platforms: [],
    date: event.date,
    status: "published",
  };
}

export function rankEventPerformers(
  workspace: WorkspaceProfile,
  events: ContentEvent[],
  options: {
    timeframe?: Timeframe;
    resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  } = {},
): RankedEventPerformer[] {
  const { timeframe, resolveEventId } = options;
  const scoped = timeframe ? filterEventsInTimeframe(events, timeframe) : events;

  return scoped
    .map((event) => {
      const media = collectEventMedia(workspace, event.id, { resolveEventId });
      const perf = computeEventPerformance(media);
      const leadMedia = media.find((m) => m.status === "published");
      return { event, perf, leadMedia };
    })
    .filter((row) => row.perf.publishedCount > 0)
    .sort((a, b) => {
      if (b.perf.avgEngagement !== a.perf.avgEngagement) {
        return b.perf.avgEngagement - a.perf.avgEngagement;
      }
      return b.perf.totalViews - a.perf.totalViews;
    });
}

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}
