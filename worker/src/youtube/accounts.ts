import { decryptSecret, encryptSecret } from "../lib/crypto.js";
import { getDb } from "../db/client.js";
import { refreshYouTubeAccessToken } from "./oauth.js";

export type AccountRow = {
  id: string;
  client_id: string;
  platform: string;
  external_id: string | null;
  display_name: string | null;
  access_token_enc: string | null;
  refresh_token_enc: string;
  scopes: string | null;
  expires_at: string | null;
};

export function getYouTubeAccount(clientId: string): AccountRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM connected_accounts WHERE client_id = ? AND platform = 'YT'`)
      .get(clientId) as AccountRow | undefined) ?? null
  );
}

export async function getYouTubeAccessToken(clientId: string) {
  const account = getYouTubeAccount(clientId);
  if (!account) return null;

  const refreshToken = decryptSecret(account.refresh_token_enc);
  const expiresAt = account.expires_at ? Date.parse(account.expires_at) : 0;
  const stillValid = account.access_token_enc && expiresAt > Date.now() + 60_000;

  if (stillValid && account.access_token_enc) {
    return decryptSecret(account.access_token_enc);
  }

  const refreshed = await refreshYouTubeAccessToken(refreshToken);
  getDb()
    .prepare(
      `UPDATE connected_accounts SET
        access_token_enc = ?,
        refresh_token_enc = ?,
        expires_at = ?,
        scopes = COALESCE(?, scopes),
        updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      encryptSecret(refreshed.access_token),
      refreshed.refresh_token ? encryptSecret(refreshed.refresh_token) : account.refresh_token_enc,
      new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      refreshed.scope ?? null,
      account.id,
    );

  return refreshed.access_token;
}

export function upsertYouTubeAccount(input: {
  clientId: string;
  channelId: string;
  channelTitle: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes?: string;
}) {
  const id = `yt-${input.clientId}`;
  getDb()
    .prepare(
      `INSERT INTO connected_accounts (
        id, client_id, platform, external_id, display_name,
        access_token_enc, refresh_token_enc, scopes, expires_at, status, updated_at
      ) VALUES (?, ?, 'YT', ?, ?, ?, ?, ?, ?, 'connected', datetime('now'))
      ON CONFLICT(client_id, platform) DO UPDATE SET
        external_id = excluded.external_id,
        display_name = excluded.display_name,
        access_token_enc = excluded.access_token_enc,
        refresh_token_enc = excluded.refresh_token_enc,
        scopes = excluded.scopes,
        expires_at = excluded.expires_at,
        status = 'connected',
        updated_at = datetime('now')`,
    )
    .run(
      id,
      input.clientId,
      input.channelId,
      input.channelTitle,
      encryptSecret(input.accessToken),
      encryptSecret(input.refreshToken),
      input.scopes ?? null,
      new Date(Date.now() + input.expiresIn * 1000).toISOString(),
    );
}
