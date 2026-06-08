import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseConfigured } from "@/server/db/client";
import { requireTeamSession } from "@/server/team-auth";
import { syncAllMetaWorkspaces, syncMetaWorkspace } from "@/server/meta/sync";
import { DEFAULT_WORKSPACE_ID } from "@/server/meta/config";

function isAuthorizedSync(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return requireTeamSession(request);
}

async function handleSync(request: Request) {
  if (!isAuthorizedSync(request)) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ detail: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const workspaceId = new URL(request.url).searchParams.get("workspace");
  const cronAuth = Boolean(
    process.env.CRON_SECRET &&
      request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`,
  );

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