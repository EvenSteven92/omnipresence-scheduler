import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseConfigured } from "@/server/db/client";
import { requireTeamSession } from "@/server/team-auth";
import { syncYouTubeWorkspace } from "@/server/youtube/sync";
import { DEFAULT_WORKSPACE_ID } from "@/server/youtube/config";

function isAuthorizedSync(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return requireTeamSession(request);
}

export const Route = createFileRoute("/api/youtube/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthorizedSync(request)) {
          return Response.json({ detail: "Unauthorized" }, { status: 401 });
        }
        if (!isDatabaseConfigured()) {
          return Response.json({ detail: "DATABASE_URL is not configured" }, { status: 503 });
        }

        const workspaceId =
          new URL(request.url).searchParams.get("workspace") ?? DEFAULT_WORKSPACE_ID;

        try {
          const result = await syncYouTubeWorkspace(workspaceId);
          return Response.json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "YouTube sync failed";
          return Response.json({ detail: message }, { status: 502 });
        }
      },
    },
  },
});