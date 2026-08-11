import { createFileRoute } from "@tanstack/react-router";

/** Local-only: posts live in the browser (localStorage). No cloud DB. */
export const Route = createFileRoute("/api/posts")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            source: "local",
            posts: [],
            detail: "Browser-local mode — posts are stored in localStorage",
          },
          { status: 503 },
        ),
      POST: async () =>
        Response.json(
          { detail: "Browser-local mode — posts are stored in localStorage" },
          { status: 503 },
        ),
    },
  },
});
