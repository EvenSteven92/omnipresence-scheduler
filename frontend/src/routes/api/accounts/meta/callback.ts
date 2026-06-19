import { createFileRoute } from "@tanstack/react-router";

import { getAppBaseUrl } from "@/server/meta/config";
import { exchangeMetaCode, verifyOAuthState } from "@/server/meta/oauth";
import { connectMetaWorkspaceFromCode } from "@/server/meta/sync";

export const Route = createFileRoute("/api/accounts/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const oauthError = url.searchParams.get("error");
        const base = getAppBaseUrl();
        const redirectBase = `${base}/workspaces`;

        if (oauthError) {
          return new Response(null, {
            status: 302,
            headers: { Location: `${redirectBase}?meta=denied#connect-platform` },
          });
        }

        if (!code || !state) {
          return Response.json({ detail: "Missing OAuth code or state" }, { status: 400 });
        }

        const parsedState = verifyOAuthState(state);
        if (!parsedState) {
          return Response.json({ detail: "Invalid OAuth state" }, { status: 400 });
        }

        try {
          const tokens = await exchangeMetaCode(code);
          const result = await connectMetaWorkspaceFromCode(
            parsedState.workspaceId,
            tokens.access_token,
            undefined,
          );

          const warning =
            "warnings" in result && Array.isArray(result.warnings) && result.warnings[0]
              ? `&message=${encodeURIComponent(result.warnings[0])}`
              : "";
          const status = warning ? "partial" : "connected";

          return new Response(null, {
            status: 302,
            headers: {
              Location: `${redirectBase}?meta=${status}${warning}#connect-platform`,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Meta connect failed";
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${redirectBase}?meta=error&message=${encodeURIComponent(message)}#connect-platform`,
            },
          });
        }
      },
    },
  },
});
