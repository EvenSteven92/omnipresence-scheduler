import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseConfigured } from "@/server/db/client";
import { getYouTubeMetrics } from "@/server/youtube/sync";
import { DEFAULT_WORKSPACE_ID } from "@/server/youtube/config";

export const Route = createFileRoute("/api/youtube/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ connected: false, channel: null, videos: [] });
        }

        const workspaceId =
          new URL(request.url).searchParams.get("workspace") ?? DEFAULT_WORKSPACE_ID;

        try {
          const metrics = await getYouTubeMetrics(workspaceId);
          return Response.json(metrics);
        } catch {
          return Response.json({ connected: false, channel: null, videos: [] });
        }
      },
    },
  },
});
