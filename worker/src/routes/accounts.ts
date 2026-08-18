import { Hono } from "hono";
import { getDb } from "../db/client.js";
import { appBaseUrl } from "../lib/env.js";
import { buildYouTubeAuthorizeUrl, exchangeYouTubeCode, verifyOAuthState as verifyYtState } from "../youtube/oauth.js";
import { fetchMyChannel } from "../youtube/api.js";
import { upsertYouTubeAccount } from "../youtube/accounts.js";
import { syncYouTubeClient } from "../youtube/sync.js";
import { buildMetaAuthorizeUrl, exchangeMetaCode, verifyOAuthState as verifyMetaState } from "../meta/oauth.js";
import { connectMetaClientFromCode } from "../meta/sync.js";

export const accountsRoutes = new Hono();

const LIVE = ["YT", "FB", "IG"] as const;

accountsRoutes.get("/status", (c) => {
  const clientId = c.req.query("workspace") ?? "torcc";
  const db = getDb();

  const ytAccount = db
    .prepare(`SELECT * FROM connected_accounts WHERE client_id = ? AND platform = 'YT'`)
    .get(clientId) as { external_id?: string; synced_at?: string } | undefined;
  const channel = db
    .prepare(`SELECT * FROM youtube_channel_snapshots WHERE client_id = ?`)
    .get(clientId) as
    | { channel_id: string; channel_title: string; synced_at: string }
    | undefined;
  const fbAccount = db
    .prepare(`SELECT * FROM connected_accounts WHERE client_id = ? AND platform = 'FB'`)
    .get(clientId);
  const fbPage = db
    .prepare(`SELECT * FROM facebook_page_snapshots WHERE client_id = ?`)
    .get(clientId) as
    | { page_id: string; page_name: string; synced_at: string }
    | undefined;
  const igAccount = db
    .prepare(`SELECT * FROM connected_accounts WHERE client_id = ? AND platform = 'IG'`)
    .get(clientId);
  const ig = db
    .prepare(`SELECT * FROM instagram_account_snapshots WHERE client_id = ?`)
    .get(clientId) as
    | { ig_user_id: string; username: string; synced_at: string }
    | undefined;

  const youtubeConnected = Boolean(ytAccount && channel);
  const facebookConnected = Boolean(fbAccount && fbPage);
  const instagramConnected = Boolean(igAccount && ig);

  return c.json({
    livePlatforms: [...LIVE],
    connections: LIVE.map((platform) => ({
      platform,
      status:
        platform === "YT"
          ? youtubeConnected
            ? "ok"
            : "disconnected"
          : platform === "FB"
            ? facebookConnected
              ? "ok"
              : "disconnected"
            : instagramConnected
              ? "ok"
              : "disconnected",
    })),
    youtube: {
      connected: youtubeConnected,
      channelTitle: channel?.channel_title,
      channelId: channel?.channel_id,
      syncedAt: channel?.synced_at,
    },
    meta: {
      facebook: {
        connected: facebookConnected,
        pageName: fbPage?.page_name,
        pageId: fbPage?.page_id,
        syncedAt: fbPage?.synced_at,
      },
      instagram: {
        connected: instagramConnected,
        username: ig?.username,
        igUserId: ig?.ig_user_id,
        syncedAt: ig?.synced_at,
      },
    },
  });
});

accountsRoutes.get("/youtube/connect", (c) => {
  try {
    const clientId = c.req.query("workspace") ?? "torcc";
    const { url } = buildYouTubeAuthorizeUrl(clientId);
    return c.redirect(url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube OAuth is not configured";
    return c.json({ detail: message }, 503);
  }
});

accountsRoutes.get("/youtube/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const redirectBase = `${appBaseUrl()}/clients`;

  if (oauthError) {
    return c.redirect(`${redirectBase}?youtube=denied#connect-platform`, 302);
  }
  if (!code || !state) return c.json({ detail: "Missing OAuth code or state" }, 400);

  const parsed = verifyYtState(state);
  if (!parsed) return c.json({ detail: "Invalid OAuth state" }, 400);

  try {
    const tokens = await exchangeYouTubeCode(code);
    if (!tokens.refresh_token) {
      throw new Error("Google did not return a refresh token; revoke app access and retry");
    }
    const channel = await fetchMyChannel(tokens.access_token);
    upsertYouTubeAccount({
      clientId: parsed.clientId,
      channelId: channel.channelId,
      channelTitle: channel.channelTitle,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scopes: tokens.scope,
    });
    await syncYouTubeClient(parsed.clientId);
    return c.redirect(`${redirectBase}?youtube=connected#connect-platform`, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube connect failed";
    return c.redirect(
      `${redirectBase}?youtube=error&message=${encodeURIComponent(message)}#connect-platform`,
      302,
    );
  }
});

accountsRoutes.get("/meta/connect", (c) => {
  try {
    const clientId = c.req.query("workspace") ?? "torcc";
    const { url } = buildMetaAuthorizeUrl(clientId);
    return c.redirect(url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta OAuth is not configured";
    return c.json({ detail: message }, 503);
  }
});

accountsRoutes.get("/meta/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const redirectBase = `${appBaseUrl()}/clients`;

  if (oauthError) {
    return c.redirect(`${redirectBase}?meta=denied#connect-platform`, 302);
  }
  if (!code || !state) return c.json({ detail: "Missing OAuth code or state" }, 400);

  const parsed = verifyMetaState(state);
  if (!parsed) return c.json({ detail: "Invalid OAuth state" }, 400);

  try {
    const tokens = await exchangeMetaCode(code);
    const result = await connectMetaClientFromCode(parsed.clientId, tokens.access_token);
    const warning =
      "warnings" in result && Array.isArray(result.warnings) && result.warnings[0]
        ? `&message=${encodeURIComponent(result.warnings[0])}`
        : "";
    const status = warning ? "partial" : "connected";
    return c.redirect(`${redirectBase}?meta=${status}${warning}#connect-platform`, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta connect failed";
    return c.redirect(
      `${redirectBase}?meta=error&message=${encodeURIComponent(message)}#connect-platform`,
      302,
    );
  }
});
