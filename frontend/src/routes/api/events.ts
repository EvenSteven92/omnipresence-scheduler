import { createFileRoute } from "@tanstack/react-router";

/** Local-only: custom events live in the browser (localStorage). No cloud DB. */
export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            source: "local",
            events: [],
            detail: "Browser-local mode — events are stored in localStorage",
          },
          { status: 503 },
        ),
      POST: async () =>
        Response.json(
          { detail: "Browser-local mode — events are stored in localStorage" },
          { status: 503 },
        ),
    },
  },
});
