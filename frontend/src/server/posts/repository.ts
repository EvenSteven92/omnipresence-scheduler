import { asc, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import type { Platform, ScheduledPost } from "@/lib/mock-data";
import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { contentEvents, postTargets, posts } from "@/server/db/schema";
import type { ContentEvent, ContentEventKind } from "@/lib/workspaces/types";

function uid(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export type CreatePostInput = {
  id?: string;
  workspaceId: string;
  title: string;
  caption?: string;
  hashtags?: string;
  transcript?: string;
  mediaKind?: string;
  format?: string;
  status?: "draft" | "scheduled" | "published";
  eventId?: string | null;
  dropboxUrl?: string | null;
  previewUrl?: string | null;
  platforms: Platform[];
  platformTimes: Partial<Record<Platform, string>>;
  date: string;
};

function rowToScheduledPost(
  post: typeof posts.$inferSelect,
  targets: (typeof postTargets.$inferSelect)[],
): ScheduledPost {
  const platformTimes: Partial<Record<Platform, string>> = {};
  const platforms: Platform[] = [];
  for (const t of targets) {
    const p = t.platform as Platform;
    platforms.push(p);
    platformTimes[p] = t.scheduledAt.toISOString();
  }
  return {
    id: post.id,
    title: post.title,
    caption: post.caption || undefined,
    hashtags: post.hashtags || undefined,
    platforms,
    platformTimes,
    date: post.primaryAt.toISOString(),
    status: (post.status as ScheduledPost["status"]) || "scheduled",
    eventId: post.eventId ?? undefined,
  };
}

export async function listPostsForWorkspace(workspaceId: string): Promise<ScheduledPost[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const postRows = await db
    .select()
    .from(posts)
    .where(eq(posts.workspaceId, workspaceId))
    .orderBy(asc(posts.primaryAt));

  if (postRows.length === 0) return [];

  const ids = postRows.map((p) => p.id);
  const targetRows = await db.select().from(postTargets).where(inArray(postTargets.postId, ids));

  const byPost = new Map<string, (typeof postTargets.$inferSelect)[]>();
  for (const t of targetRows) {
    const arr = byPost.get(t.postId) ?? [];
    arr.push(t);
    byPost.set(t.postId, arr);
  }

  return postRows.map((p) => rowToScheduledPost(p, byPost.get(p.id) ?? []));
}

export async function upsertPost(input: CreatePostInput): Promise<ScheduledPost> {
  const db = getDb();
  const id = input.id ?? uid("post");
  const now = new Date();
  const primaryAt = new Date(input.date);

  await db
    .insert(posts)
    .values({
      id,
      workspaceId: input.workspaceId,
      title: input.title,
      caption: input.caption ?? "",
      hashtags: input.hashtags ?? "",
      transcript: input.transcript ?? "",
      mediaKind: input.mediaKind ?? "video",
      format: input.format ?? "portrait",
      status: input.status ?? "scheduled",
      eventId: input.eventId ?? null,
      dropboxUrl: input.dropboxUrl ?? null,
      previewUrl: input.previewUrl ?? null,
      primaryAt,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: posts.id,
      set: {
        title: input.title,
        caption: input.caption ?? "",
        hashtags: input.hashtags ?? "",
        transcript: input.transcript ?? "",
        mediaKind: input.mediaKind ?? "video",
        format: input.format ?? "portrait",
        status: input.status ?? "scheduled",
        eventId: input.eventId ?? null,
        dropboxUrl: input.dropboxUrl ?? null,
        previewUrl: input.previewUrl ?? null,
        primaryAt,
        updatedAt: now,
      },
    });

  // Replace targets
  await db.delete(postTargets).where(eq(postTargets.postId, id));
  const targetValues = input.platforms.map((platform) => {
    const iso = input.platformTimes[platform] ?? input.date;
    return {
      id: uid("tgt"),
      postId: id,
      platform,
      scheduledAt: new Date(iso),
      status: input.status ?? "scheduled",
      createdAt: now,
      updatedAt: now,
    };
  });
  if (targetValues.length > 0) {
    await db.insert(postTargets).values(targetValues);
  }

  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  const targets = await db.select().from(postTargets).where(eq(postTargets.postId, id));
  return rowToScheduledPost(post!, targets);
}

export async function upsertPosts(inputs: CreatePostInput[]): Promise<ScheduledPost[]> {
  const out: ScheduledPost[] = [];
  for (const input of inputs) {
    out.push(await upsertPost(input));
  }
  return out;
}

export async function patchPost(
  postId: string,
  patch: Partial<{
    title: string;
    eventId: string | null;
    status: string;
    platformTimes: Partial<Record<Platform, string>>;
    platforms: Platform[];
    date: string;
  }>,
): Promise<ScheduledPost | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [existing] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!existing) return null;

  const targets = await db.select().from(postTargets).where(eq(postTargets.postId, postId));
  const current = rowToScheduledPost(existing, targets);

  const platforms = patch.platforms ?? current.platforms;
  const platformTimes = { ...(current.platformTimes ?? {}), ...(patch.platformTimes ?? {}) };
  const date =
    patch.date ??
    platforms
      .map((p) => platformTimes[p])
      .filter(Boolean)
      .sort()[0] ??
    current.date;

  return upsertPost({
    id: postId,
    workspaceId: existing.workspaceId,
    title: patch.title ?? current.title,
    caption: current.caption,
    hashtags: current.hashtags,
    status: (patch.status as CreatePostInput["status"]) ?? current.status,
    eventId: patch.eventId !== undefined ? patch.eventId : (current.eventId ?? null),
    platforms,
    platformTimes,
    date,
    mediaKind: existing.mediaKind,
    format: existing.format,
    dropboxUrl: existing.dropboxUrl,
    previewUrl: existing.previewUrl,
  });
}

export async function deletePost(postId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const db = getDb();
  await db.delete(postTargets).where(eq(postTargets.postId, postId));
  const deleted = await db.delete(posts).where(eq(posts.id, postId)).returning({ id: posts.id });
  return deleted.length > 0;
}

export async function listEventsForWorkspace(workspaceId: string): Promise<ContentEvent[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(contentEvents)
    .where(eq(contentEvents.workspaceId, workspaceId))
    .orderBy(asc(contentEvents.date));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date.toISOString(),
    kind: r.kind as ContentEventKind,
    description: r.description || undefined,
  }));
}

export async function createEvent(
  workspaceId: string,
  event: ContentEvent,
): Promise<ContentEvent> {
  const db = getDb();
  const id = event.id || uid("evt");
  const now = new Date();
  await db.insert(contentEvents).values({
    id,
    workspaceId,
    title: event.title,
    date: new Date(event.date),
    kind: event.kind,
    description: event.description ?? "",
    createdAt: now,
    updatedAt: now,
  });
  return { ...event, id };
}

export async function associatePostEvent(
  postId: string,
  eventId: string | null,
): Promise<ScheduledPost | null> {
  return patchPost(postId, { eventId });
}

/** Used by API to detect db-backed mode without throwing. */
export { isDatabaseConfigured };
