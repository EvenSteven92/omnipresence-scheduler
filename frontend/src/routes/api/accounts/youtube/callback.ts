import { createFileRoute } from "@tanstack/react-router";

import { getAppBaseUrl } from "@/server/youtube/config";
import {
  clearOAuthStateCookie,
  exchangeYouTubeCode,
  verifyOAuthState,
} from "@/server/youtube/oauth";
import { fetchMyChannel } from "@/server/youtube/api";
import { upsertYouTubeAccount } from "@/server/youtube/accounts";
import { syncYouTubeWorkspace } from "@/server/youtube/sync";

export const Route = createFileRoute("/api/accounts/youtube/callback")({
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
            headers: {
              Location: `${redirectBase}?youtube=denied#connect-platform`,
              "Set-Cookie": clearOAuthStateCookie(),
            },
          });
        }

        if (!code || !state) {
          return Response.json({ detail: "Missing OAuth code or state" }, { status: 400 });
        }

        // State is HMAC-signed — no cookie required (cookies often drop on Google redirect).
        const parsedState = verifyOAuthState(state);
        if (!parsedState) {
          return Response.json({ detail: "Invalid OAuth state" }, { status: 400 });
        }

        try {
          const tokens = await exchangeYouTubeCode(code);
          if (!tokens.refresh_token) {
            throw new Error("Google did not return a refresh token; revoke app access and retry");
          }

          const channel = await fetchMyChannel(tokens.access_token);
          await upsertYouTubeAccount({
            workspaceId: parsedState.workspaceId,
            channelId: channel.channelId,
            channelTitle: channel.channelTitle,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
            scopes: tokens.scope,
          });
          await syncYouTubeWorkspace(parsedState.workspaceId);

          return new Response(null, {
            status: 302,
            headers: {
              Location: `${redirectBase}?youtube=connected#connect-platform`,
              "Set-Cookie": clearOAuthStateCookie(),
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "YouTube connect failed";
          return new Response(null, {
            status: 302,
            headers: {
              Location: `${redirectBase}?youtube=error&message=${encodeURIComponent(message)}#connect-platform`,
              "Set-Cookie": clearOAuthStateCookie(),
            },
          });
        }
      },
    },
  },
});