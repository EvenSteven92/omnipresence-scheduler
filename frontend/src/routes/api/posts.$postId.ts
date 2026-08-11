import { createFileRoute } from "@tanstack/react-router";

/** Local-only: posts live in the browser (sessionStorage). No cloud DB. */
export const Route = createFileRoute("/api/posts/$postId")({
  server: {
    handlers: {
      PATCH: async () =>
        Response.json(
          { detail: "Browser-local mode — posts are stored in sessionStorage" },
          { status: 503 },
        ),
      DELETE: async () =>
        Response.json(
          { detail: "Browser-local mode — posts are stored in sessionStorage" },
          { status: 503 },
        ),
    },
  },
});
