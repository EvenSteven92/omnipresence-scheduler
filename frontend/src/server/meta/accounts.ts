import { and, eq } from "drizzle-orm";

import { decryptSecret, encryptSecret } from "@/server/crypto/tokens";
import { getDb } from "@/server/db/client";
import { connectedAccounts } from "@/server/db/schema";

import { fetchManagedPages } from "./api";
import { exchangeForLongLivedUserToken } from "./oauth";

export async function getMetaAccount(workspaceId: string, platform: "FB" | "IG") {
  const db = getDb();
  const [row] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.workspaceId, workspaceId),
        eq(connectedAccounts.platform, platform),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getMetaPageAccessToken(workspaceId: string) {
  const account = await getMetaAccount(workspaceId, "FB");
  if (!account?.accessTokenEnc) return null;
  return decryptSecret(account.accessTokenEnc);
}

export async function getMetaInstagramAccessToken(workspaceId: string) {
  const fbToken = await getMetaPageAccessToken(workspaceId);
  if (fbToken) return fbToken;
  const account = await getMetaAccount(workspaceId, "IG");
  if (!account?.accessTokenEnc) return null;
  return decryptSecret(account.accessTokenEnc);
}

export async function getMetaUserAccessToken(workspaceId: string) {
  const account = await getMetaAccount(workspaceId, "FB");
  if (!account) return null;
  return decryptSecret(account.refreshTokenEnc);
}

/** Re-fetch page token from /me/accounts so new permissions apply without reconnecting. */
export async function refreshMetaPageAccessToken(workspaceId: string) {
  const account = await getMetaAccount(workspaceId, "FB");
  if (!account?.externalAccountId) return null;

  const userToken = await getMetaUserAccessToken(workspaceId);
  if (!userToken) return null;

  const pages = await fetchManagedPages(userToken);
  const page = pages.find((p) => p.id === account.externalAccountId) ?? pages[0];
  if (!page?.access_token) return null;

  const db = getDb();
  await db
    .update(connectedAccounts)
    .set({
      accessTokenEnc: encryptSecret(page.access_token),
      accountLabel: page.name,
      updatedAt: new Date(),
    })
    .where(eq(connectedAccounts.id, account.id));

  const igAccount = await getMetaAccount(workspaceId, "IG");
  if (igAccount) {
    await db
      .update(connectedAccounts)
      .set({
        accessTokenEnc: encryptSecret(page.access_token),
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, igAccount.id));
  }

  return page.access_token;
}

export async function refreshMetaUserAccessToken(workspaceId: string) {
  const account = await getMetaAccount(workspaceId, "FB");
  if (!account) return null;

  const userToken = decryptSecret(account.refreshTokenEnc);
  const refreshed = await exchangeForLongLivedUserToken(userToken);
  const db = getDb();
  await db
    .update(connectedAccounts)
    .set({
      refreshTokenEnc: encryptSecret(refreshed.access_token),
      expiresAt: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000)
        : account.expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(connectedAccounts.id, account.id));

  return refreshed.access_token;
}

export async function upsertMetaFacebookAccount(input: {
  workspaceId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  userAccessToken: string;
  userTokenExpiresIn?: number;
  scopes?: string;
}) {
  const db = getDb();
  const id = `fb-${input.workspaceId}`;
  const values = {
    id,
    workspaceId: input.workspaceId,
    platform: "FB",
    externalAccountId: input.pageId,
    accountLabel: input.pageName,
    accessTokenEnc: encryptSecret(input.pageAccessToken),
    refreshTokenEnc: encryptSecret(input.userAccessToken),
    expiresAt: input.userTokenExpiresIn
      ? new Date(Date.now() + input.userTokenExpiresIn * 1000)
      : null,
    scopes: input.scopes,
    updatedAt: new Date(),
  };

  await db
    .insert(connectedAccounts)
    .values({ ...values, createdAt: new Date() })
    .onConflictDoUpdate({
      target: [connectedAccounts.workspaceId, connectedAccounts.platform],
      set: values,
    });
}

export async function upsertMetaInstagramAccount(input: {
  workspaceId: string;
  igUserId: string;
  username: string;
  pageAccessToken: string;
  userAccessToken: string;
  userTokenExpiresIn?: number;
  scopes?: string;
}) {
  const db = getDb();
  const id = `ig-${input.workspaceId}`;
  const values = {
    id,
    workspaceId: input.workspaceId,
    platform: "IG",
    externalAccountId: input.igUserId,
    accountLabel: input.username,
    accessTokenEnc: encryptSecret(input.pageAccessToken),
    refreshTokenEnc: encryptSecret(input.userAccessToken),
    expiresAt: input.userTokenExpiresIn
      ? new Date(Date.now() + input.userTokenExpiresIn * 1000)
      : null,
    scopes: input.scopes,
    updatedAt: new Date(),
  };

  await db
    .insert(connectedAccounts)
    .values({ ...values, createdAt: new Date() })
    .onConflictDoUpdate({
      target: [connectedAccounts.workspaceId, connectedAccounts.platform],
      set: values,
    });
}