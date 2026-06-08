import { createFileRoute } from "@tanstack/react-router";

import { getWorkspaceAccountsStatus } from "@/server/accounts/status";
import { DEFAULT_WORKSPACE_ID } from "@/server/youtube/config";

export const Route = createFileRoute("/api/accounts/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const workspaceId =
          new URL(request.url).searchParams.get("workspace") ?? DEFAULT_WORKSPACE_ID;
        const status = await getWorkspaceAccountsStatus(workspaceId);
        return Response.json(status);
      },
    },
  },
});