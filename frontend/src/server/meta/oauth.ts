import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  getMetaLoginConfigId,
  getMetaOAuthConfig,
  getMetaOAuthScopes,
  META_GRAPH_VERSION,
} from "./config";

function stateSecret() {
  return process.env.SESSION_SECRET ?? process.env.TEAM_ACCESS_CODE ?? "dev-meta-oauth";
}

export function createOAuthState(workspaceId: string) {
  const nonce = randomBytes(16).toString("base64url");
  const payload = `${workspaceId}.${nonce}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyOAuthState(state: string) {
  const parts = state.split(".");
  if (parts.length !== 3) return null;
  const [workspaceId, nonce, sig] = parts;
  const payload = `${workspaceId}.${nonce}`;
  const expected = createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return { workspaceId };
}

export function buildMetaAuthorizeUrl(workspaceId: string) {
  const { appId, redirectUri } = getMetaOAuthConfig();
  const state = createOAuthState(workspaceId);
  const configId = getMetaLoginConfigId();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });

  // Prefer Facebook Login for Business configuration (page-picker UX, no personal activity).
  if (configId) {
    params.set("config_id", configId);
  } else {
    params.set("scope", getMetaOAuthScopes().join(","));
  }

  return {
    url: `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params}`,
    state,
  };
}

interface MetaTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export async function exchangeMetaCode(code: string): Promise<MetaTokenResponse> {
  const { appId, appSecret, redirectUri } = getMetaOAuthConfig();
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${params}`,
  );
  if (!res.ok) {
    throw new Error(`Meta token exchange failed: ${await res.text()}`);
  }
  return res.json() as Promise<MetaTokenResponse>;
}

export async function exchangeForLongLivedUserToken(
  shortLivedToken: string,
): Promise<MetaTokenResponse> {
  const { appId, appSecret } = getMetaOAuthConfig();
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${params}`,
  );
  if (!res.ok) {
    throw new Error(`Meta long-lived token exchange failed: ${await res.text()}`);
  }
  return res.json() as Promise<MetaTokenResponse>;
}