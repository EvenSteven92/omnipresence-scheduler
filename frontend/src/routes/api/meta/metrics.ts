import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseConfigured } from "@/server/db/client";
import { getMetaMetrics } from "@/server/meta/sync";
import { DEFAULT_WORKSPACE_ID } from "@/server/meta/config";

export const Route = createFileRoute("/api/meta/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({
            facebook: { connected: false, page: null, posts: [] },
            instagram: { connected: false, account: null, media: [] },
          });
        }

        const workspaceId =
          new URL(request.url).searchParams.get("workspace") ?? DEFAULT_WORKSPACE_ID;
        const metrics = await getMetaMetrics(workspaceId);
        return Response.json(metrics);
      },
    },
  },
});
