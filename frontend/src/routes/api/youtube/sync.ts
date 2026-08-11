import { createFileRoute } from "@tanstack/react-router";

/** Local-only: YouTube sync requires OAuth + DB (removed). */
export const Route = createFileRoute("/api/youtube/sync")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { detail: "Local-only mode — YouTube sync is not available" },
          { status: 503 },
        ),
      POST: async () =>
        Response.json(
          { detail: "Local-only mode — YouTube sync is not available" },
          { status: 503 },
        ),
    },
  },
});
