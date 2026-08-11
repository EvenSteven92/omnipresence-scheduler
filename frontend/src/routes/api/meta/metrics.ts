import { createFileRoute } from "@tanstack/react-router";

/** Local-only: live Meta metrics require OAuth + DB (removed). */
export const Route = createFileRoute("/api/meta/metrics")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          facebook: { connected: false, page: null, posts: [] },
          instagram: { connected: false, account: null, media: [] },
        }),
    },
  },
});
