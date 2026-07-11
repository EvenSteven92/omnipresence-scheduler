import type { Platform, ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";

export type PostsApiSource = "db" | "unavailable" | "error";

export async function fetchWorkspacePosts(
  workspaceId: string,
): Promise<{ source: PostsApiSource; posts: ScheduledPost[] }> {
  try {
    const res = await fetch(`/api/posts?workspace=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    });
    if (res.status === 503) {
      return { source: "unavailable", posts: [] };
    }
    if (!res.ok) {
      return { source: "error", posts: [] };
    }
    const data = (await res.json()) as { source?: string; posts?: ScheduledPost[] };
    return { source: "db", posts: data.posts ?? [] };
  } catch {
    return { source: "error", posts: [] };
  }
}

export type SavePostPayload = {
  id?: string;
  workspaceId: string;
  title: string;
  caption?: string;
  hashtags?: string;
  transcript?: string;
  mediaKind?: string;
  format?: string;
  status?: "draft" | "scheduled" | "published" | "failed";
  eventId?: string | null;
  dropboxUrl?: string | null;
  previewUrl?: string | null;
  platforms: Platform[];
  platformTimes?: Partial<Record<Platform, string>>;
  date: string;
};

export async function savePosts(posts: SavePostPayload[]): Promise<ScheduledPost[] | null> {
  try {
    const res = await fetch("/api/posts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(posts.length === 1 ? posts[0] : { posts }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { posts?: ScheduledPost[] };
    return data.posts ?? null;
  } catch {
    return null;
  }
}

export async function patchPostRemote(
  postId: string,
  body: {
    eventId?: string | null;
    title?: string;
    platforms?: Platform[];
    platformTimes?: Partial<Record<Platform, string>>;
    date?: string;
    status?: string;
  },
): Promise<ScheduledPost | null> {
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { post?: ScheduledPost };
    return data.post ?? null;
  } catch {
    return null;
  }
}

export async function deletePostRemote(postId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchWorkspaceEvents(
  workspaceId: string,
): Promise<{ source: PostsApiSource; events: ContentEvent[] }> {
  try {
    const res = await fetch(`/api/events?workspace=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    });
    if (res.status === 503) return { source: "unavailable", events: [] };
    if (!res.ok) return { source: "error", events: [] };
    const data = (await res.json()) as { events?: ContentEvent[] };
    return { source: "db", events: data.events ?? [] };
  } catch {
    return { source: "error", events: [] };
  }
}

export async function createEventRemote(
  workspaceId: string,
  event: ContentEvent,
): Promise<ContentEvent | null> {
  try {
    const res = await fetch("/api/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        id: event.id,
        title: event.title,
        date: event.date,
        kind: event.kind,
        description: event.description,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { event?: ContentEvent };
    return data.event ?? null;
  } catch {
    return null;
  }
}
