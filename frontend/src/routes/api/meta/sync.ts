import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseConfigured } from "@/server/db/client";
import { syncAllMetaWorkspaces, syncMetaWorkspace } from "@/server/meta/sync";
import { DEFAULT_WORKSPACE_ID } from "@/server/meta/config";

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
      const result = await syncAllMetaWorkspaces();
      return Response.json(result);
    }

    const targetWorkspace = workspaceId ?? DEFAULT_WORKSPACE_ID;
    const result = await syncMetaWorkspace(targetWorkspace);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta sync failed";
    return Response.json({ detail: message }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/meta/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => handleSync(request),
      POST: async ({ request }) => handleSync(request),
    },
  },
});
