import { createFileRoute } from "@tanstack/react-router";

/** Local-only: Meta sync requires OAuth + DB (removed). */
export const Route = createFileRoute("/api/meta/sync")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { detail: "Local-only mode — Meta sync is not available" },
          { status: 503 },
        ),
      POST: async () =>
        Response.json(
          { detail: "Local-only mode — Meta sync is not available" },
          { status: 503 },
        ),
    },
  },
});
