import { createFileRoute } from "@tanstack/react-router";

import { isDatabaseConfigured } from "@/server/db/client";
import { requireTeamSession } from "@/server/team-auth";
import { buildYouTubeAuthorizeUrl, oauthStateCookie } from "@/server/youtube/oauth";
import { DEFAULT_WORKSPACE_ID } from "@/server/youtube/config";

export const Route = createFileRoute("/api/accounts/youtube/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requireTeamSession(request)) {
          return Response.json({ detail: "Team login required" }, { status: 401 });
        }
        if (!isDatabaseConfigured()) {
          return Response.json({ detail: "DATABASE_URL is not configured" }, { status: 503 });
        }

        try {
          const workspaceId =
            new URL(request.url).searchParams.get("workspace") ?? DEFAULT_WORKSPACE_ID;
          const { url, state } = buildYouTubeAuthorizeUrl(workspaceId);
          return new Response(null, {
            status: 302,
            headers: {
              Location: url,
              "Set-Cookie": oauthStateCookie(state),
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "YouTube OAuth is not configured";
          return Response.json({ detail: message }, { status: 503 });
        }
      },
    },
  },
});
