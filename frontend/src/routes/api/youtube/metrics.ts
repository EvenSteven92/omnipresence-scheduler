import { createFileRoute } from "@tanstack/react-router";

/** Local-only: live YouTube metrics require OAuth + DB (removed). */
export const Route = createFileRoute("/api/youtube/metrics")({
  server: {
    handlers: {
      GET: async () => Response.json({ connected: false, channel: null, videos: [] }),
    },
  },
});
