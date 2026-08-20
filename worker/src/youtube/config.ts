import { appBaseUrl } from "../lib/env.js";

/** Readonly metrics + comment read/reply. Reconnect YouTube after this change. */
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
] as const;

export function getYouTubeOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${appBaseUrl()}/api/accounts/youtube/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for YouTube OAuth");
  }

  return { clientId, clientSecret, redirectUri };
}
