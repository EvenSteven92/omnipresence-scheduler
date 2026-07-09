import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseConfigured } from "@/server/db/client";
import { syncAllYouTubeWorkspaces, syncYouTubeWorkspace } from "@/server/youtube/sync";
import { DEFAULT_WORKSPACE_ID } from "@/server/youtube/config";

function isCronAuth(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  return Boolean(cronSecret && auth === `Bearer ${cronSecret}`);
}

async function handleSync(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ detail: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const workspaceId = new URL(request.url).searchParams.get("workspace");
  const cronAuth = isCronAuth(request);

  try {
    if (!workspaceId && cronAuth) {
      const result = await syncAllYouTubeWorkspaces();
      return Response.json(result);
    }

    const targetWorkspace = workspaceId ?? DEFAULT_WORKSPACE_ID;
    const result = await syncYouTubeWorkspace(targetWorkspace);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube sync failed";
    return Response.json({ detail: message }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/youtube/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => handleSync(request),
      POST: async ({ request }) => handleSync(request),
    },
  },
});
