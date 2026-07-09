import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import type { Platform } from "@/lib/mock-data";
import {
  associatePostEvent,
  deletePost,
  isDatabaseConfigured,
  patchPost,
} from "@/server/posts/repository";

const patchSchema = z.object({
  title: z.string().optional(),
  eventId: z.string().nullable().optional(),
  status: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  platformTimes: z.record(z.string()).optional(),
  date: z.string().optional(),
});

export const Route = createFileRoute("/api/posts/$postId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ detail: "DATABASE_URL is not configured" }, { status: 503 });
        }
        const json = await request.json().catch(() => null);
        const parsed = patchSchema.safeParse(json);
        if (!parsed.success) {
          return Response.json({ detail: parsed.error.message }, { status: 400 });
        }

        const body = parsed.data;
        try {
          if (body.eventId !== undefined && Object.keys(body).length === 1) {
            const post = await associatePostEvent(params.postId, body.eventId);
            if (!post) return Response.json({ detail: "Not found" }, { status: 404 });
            return Response.json({ post });
          }

          const post = await patchPost(params.postId, {
            title: body.title,
            eventId: body.eventId,
            status: body.status,
            platforms: body.platforms as Platform[] | undefined,
            platformTimes: body.platformTimes as Partial<Record<Platform, string>> | undefined,
            date: body.date,
          });
          if (!post) return Response.json({ detail: "Not found" }, { status: 404 });
          return Response.json({ post });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Patch failed";
          return Response.json({ detail: message }, { status: 500 });
        }
      },

      DELETE: async ({ params }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ detail: "DATABASE_URL is not configured" }, { status: 503 });
        }
        const ok = await deletePost(params.postId);
        if (!ok) return Response.json({ detail: "Not found" }, { status: 404 });
        return Response.json({ ok: true });
      },
    },
  },
});
