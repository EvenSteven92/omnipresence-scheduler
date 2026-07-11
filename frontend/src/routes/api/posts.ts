import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import type { Platform } from "@/lib/mock-data";
import {
  isDatabaseConfigured,
  listPostsForWorkspace,
  upsertPosts,
  type CreatePostInput,
} from "@/server/posts/repository";

const postBodySchema = z.object({
  id: z.string().optional(),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  transcript: z.string().optional(),
  mediaKind: z.string().optional(),
  format: z.string().optional(),
  status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
  eventId: z.string().nullable().optional(),
  dropboxUrl: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  platforms: z.array(z.string()).min(1),
  platformTimes: z.record(z.string()).optional(),
  date: z.string().min(1),
});

const bulkSchema = z.object({
  posts: z.array(postBodySchema).min(1),
});

export const Route = createFileRoute("/api/posts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json(
            { source: "unavailable", posts: [], detail: "DATABASE_URL is not configured" },
            { status: 503 },
          );
        }
        const workspaceId = new URL(request.url).searchParams.get("workspace");
        if (!workspaceId) {
          return Response.json({ detail: "workspace query required" }, { status: 400 });
        }
        const posts = await listPostsForWorkspace(workspaceId);
        return Response.json({ source: "db", posts });
      },

      POST: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json(
            { detail: "DATABASE_URL is not configured" },
            { status: 503 },
          );
        }
        const json = await request.json().catch(() => null);
        const bulk = bulkSchema.safeParse(json);
        const single = postBodySchema.safeParse(json);

        let inputs: CreatePostInput[] = [];
        if (bulk.success) {
          inputs = bulk.data.posts.map((p) => normalizeInput(p));
        } else if (single.success) {
          inputs = [normalizeInput(single.data)];
        } else {
          return Response.json(
            { detail: bulk.error?.message ?? single.error?.message ?? "Invalid body" },
            { status: 400 },
          );
        }

        try {
          const posts = await upsertPosts(inputs);
          return Response.json({ source: "db", posts });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to save posts";
          return Response.json({ detail: message }, { status: 500 });
        }
      },
    },
  },
});

function normalizeInput(p: z.infer<typeof postBodySchema>): CreatePostInput {
  const platforms = p.platforms as Platform[];
  const platformTimes = (p.platformTimes ?? {}) as Partial<Record<Platform, string>>;
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    title: p.title,
    caption: p.caption,
    hashtags: p.hashtags,
    transcript: p.transcript,
    mediaKind: p.mediaKind,
    format: p.format,
    status: p.status,
    eventId: p.eventId,
    dropboxUrl: p.dropboxUrl,
    previewUrl: p.previewUrl,
    platforms,
    platformTimes,
    date: p.date,
  };
}
