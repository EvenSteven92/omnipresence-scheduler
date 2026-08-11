/**
 * Legacy remote posts/events API helpers.
 * Local-only builds never hit a DB; hooks use sessionStorage / localStorage.
 * These remain as thin stubs for any residual imports.
 */

import type { Platform, ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";

export type PostsApiSource = "local" | "unavailable" | "error";

export async function fetchWorkspacePosts(
  _workspaceId: string,
): Promise<{ source: PostsApiSource; posts: ScheduledPost[] }> {
  return { source: "local", posts: [] };
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

export async function savePosts(_posts: SavePostPayload[]): Promise<ScheduledPost[] | null> {
  return null;
}

export async function patchPostRemote(
  _postId: string,
  _body: {
    eventId?: string | null;
    title?: string;
    platforms?: Platform[];
    platformTimes?: Partial<Record<Platform, string>>;
    date?: string;
    status?: string;
  },
): Promise<ScheduledPost | null> {
  return null;
}

export async function deletePostRemote(_postId: string): Promise<boolean> {
  return false;
}

export async function fetchWorkspaceEvents(
  _workspaceId: string,
): Promise<{ source: PostsApiSource; events: ContentEvent[] }> {
  return { source: "local", events: [] };
}

export async function createEventRemote(
  _workspaceId: string,
  _event: ContentEvent,
): Promise<ContentEvent | null> {
  return null;
}
