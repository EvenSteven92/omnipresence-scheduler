import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseConfigured } from "@/server/db/client";
import { buildMetaAuthorizeUrl } from "@/server/meta/oauth";
import { DEFAULT_WORKSPACE_ID } from "@/server/meta/config";

export const Route = createFileRoute("/api/accounts/meta/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isDatabaseConfigured()) {
          return Response.json({ detail: "DATABASE_URL is not configured" }, { status: 503 });
        }

        try {
          const workspaceId =
            new URL(request.url).searchParams.get("workspace") ?? DEFAULT_WORKSPACE_ID;
          const { url } = buildMetaAuthorizeUrl(workspaceId);
          return new Response(null, {
            status: 302,
            headers: { Location: url },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Meta OAuth is not configured";
          return Response.json({ detail: message }, { status: 503 });
        }
      },
    },
  },
});
