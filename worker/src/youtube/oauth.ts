import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getYouTubeOAuthConfig, YOUTUBE_SCOPES } from "./config.js";

function stateSecret() {
  return process.env.SESSION_SECRET ?? "dev-youtube-oauth";
}

export function createOAuthState(clientId: string) {
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${clientId}.${nonce}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string) {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [clientId, nonce, sig] = parts;
  const payload = `${clientId}.${nonce}`;
  const expected = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig!), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return { clientId: clientId! };
}

export function buildYouTubeAuthorizeUrl(clientId: string) {
  const { clientId: googleClientId, redirectUri } = getYouTubeOAuthConfig();
  const state = createOAuthState(clientId);
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: YOUTUBE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, state };
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}

export async function exchangeYouTubeCode(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getYouTubeOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<GoogleTokenResponse>;
}

export async function refreshYouTubeAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getYouTubeOAuthConfig();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json() as Promise<GoogleTokenResponse>;
}
