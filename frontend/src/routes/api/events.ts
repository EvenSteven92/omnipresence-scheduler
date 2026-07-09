import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  createEvent,
  isDatabaseConfigured,
  listEventsForWorkspace,
} from "@/server/posts/repository";
import type { ContentEventKind } from "@/lib/workspaces/types";

const eventSchema = z.object({
  id: z.string().optional(),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  kind: z.string().default("other"),
  description: z.string().optional(),
});

export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json(
            { source: "unavailable", events: [], detail: "DATABASE_URL is not configured" },
            { status: 503 },
          );
        }
        const workspaceId = new URL(request.url).searchParams.get("workspace");
        if (!workspaceId) {
          return Response.json({ detail: "workspace query required" }, { status: 400 });
        }
        const events = await listEventsForWorkspace(workspaceId);
        return Response.json({ source: "db", events });
      },

      POST: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ detail: "DATABASE_URL is not configured" }, { status: 503 });
        }
        const json = await request.json().catch(() => null);
        const parsed = eventSchema.safeParse(json);
        if (!parsed.success) {
          return Response.json({ detail: parsed.error.message }, { status: 400 });
        }
        const e = parsed.data;
        try {
          const event = await createEvent(e.workspaceId, {
            id: e.id ?? "",
            title: e.title,
            date: e.date,
            kind: e.kind as ContentEventKind,
            description: e.description,
          });
          return Response.json({ event });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to create event";
          return Response.json({ detail: message }, { status: 500 });
        }
      },
    },
  },
});
