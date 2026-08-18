import { appBaseUrl } from "../lib/env.js";

export const META_SCOPES_MINIMAL = ["pages_show_list", "business_management"] as const;

export const META_SCOPES_FULL = [
  "pages_show_list",
  "business_management",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_insights",
] as const;

export function getMetaOAuthScopes() {
  const raw = process.env.META_OAUTH_SCOPES?.trim();
  if (raw) return raw.split(/[,\s]+/).filter(Boolean);
  return [...META_SCOPES_MINIMAL];
}

export function getMetaLoginConfigId() {
  return process.env.META_LOGIN_CONFIG_ID?.trim() || null;
}

export const META_GRAPH_VERSION = "v21.0";

export function getMetaOAuthConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri =
    process.env.META_REDIRECT_URI ?? `${appBaseUrl()}/api/accounts/meta/callback`;

  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET are required for Meta OAuth");
  }

  return { appId, appSecret, redirectUri };
}
