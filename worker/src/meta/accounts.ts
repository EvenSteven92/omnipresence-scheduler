import { decryptSecret, encryptSecret } from "../lib/crypto.js";
import { getDb } from "../db/client.js";
import { fetchManagedPages } from "./api.js";

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

export function getMetaAccount(clientId: string, platform: "FB" | "IG"): AccountRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM connected_accounts WHERE client_id = ? AND platform = ?`)
      .get(clientId, platform) as AccountRow | undefined) ?? null
  );
}

export function getMetaPageAccessToken(clientId: string) {
  const account = getMetaAccount(clientId, "FB");
  if (!account?.access_token_enc) return null;
  return decryptSecret(account.access_token_enc);
}

export function getMetaUserAccessToken(clientId: string) {
  const account = getMetaAccount(clientId, "FB");
  if (!account) return null;
  return decryptSecret(account.refresh_token_enc);
}

export async function refreshMetaPageAccessToken(clientId: string) {
  const account = getMetaAccount(clientId, "FB");
  if (!account?.external_id) return null;
  const userToken = getMetaUserAccessToken(clientId);
  if (!userToken) return null;

  const pages = await fetchManagedPages(userToken);
  const page = pages.find((p) => p.id === account.external_id) ?? pages[0];
  if (!page?.access_token) return null;

  getDb()
    .prepare(
      `UPDATE connected_accounts SET access_token_enc = ?, display_name = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(encryptSecret(page.access_token), page.name, account.id);

  const ig = getMetaAccount(clientId, "IG");
  if (ig) {
    getDb()
      .prepare(
        `UPDATE connected_accounts SET access_token_enc = ?, updated_at = datetime('now') WHERE id = ?`,
      )
      .run(encryptSecret(page.access_token), ig.id);
  }

  return page.access_token;
}

export function upsertMetaFacebookAccount(input: {
  clientId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  userAccessToken: string;
  userTokenExpiresIn?: number;
  scopes?: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO connected_accounts (
        id, client_id, platform, external_id, display_name,
        access_token_enc, refresh_token_enc, scopes, expires_at, status, updated_at
      ) VALUES (?, ?, 'FB', ?, ?, ?, ?, ?, ?, 'connected', datetime('now'))
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
      `fb-${input.clientId}`,
      input.clientId,
      input.pageId,
      input.pageName,
      encryptSecret(input.pageAccessToken),
      encryptSecret(input.userAccessToken),
      input.scopes ?? null,
      input.userTokenExpiresIn
        ? new Date(Date.now() + input.userTokenExpiresIn * 1000).toISOString()
        : null,
    );
}

export function upsertMetaInstagramAccount(input: {
  clientId: string;
  igUserId: string;
  username: string;
  pageAccessToken: string;
  userAccessToken: string;
  userTokenExpiresIn?: number;
  scopes?: string;
}) {
  getDb()
    .prepare(
      `INSERT INTO connected_accounts (
        id, client_id, platform, external_id, display_name,
        access_token_enc, refresh_token_enc, scopes, expires_at, status, updated_at
      ) VALUES (?, ?, 'IG', ?, ?, ?, ?, ?, ?, 'connected', datetime('now'))
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
      `ig-${input.clientId}`,
      input.clientId,
      input.igUserId,
      input.username,
      encryptSecret(input.pageAccessToken),
      encryptSecret(input.userAccessToken),
      input.scopes ?? null,
      input.userTokenExpiresIn
        ? new Date(Date.now() + input.userTokenExpiresIn * 1000).toISOString()
        : null,
    );
}
