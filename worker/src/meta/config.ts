import { appBaseUrl } from "../lib/env.js";

/** Read-only connect (metrics). Prefer FULL when publishing. */
export const META_SCOPES_MINIMAL = ["pages_show_list", "business_management"] as const;

/** Metrics + armed auto-post (FB Page + IG). Reconnect after changing scopes. */
export const META_SCOPES_FULL = [
  "pages_show_list",
  "business_management",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
] as const;

export function getMetaOAuthScopes() {
  const raw = process.env.META_OAUTH_SCOPES?.trim();
  if (raw) return raw.split(/[,\s]+/).filter(Boolean);
  // Default to publish-capable scopes for personal armed auto-post
  return [...META_SCOPES_FULL];
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
