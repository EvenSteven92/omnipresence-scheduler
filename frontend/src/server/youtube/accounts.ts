import { eq } from "drizzle-orm";

import { decryptSecret, encryptSecret } from "@/server/crypto/tokens";
import { getDb } from "@/server/db/client";
import { connectedAccounts } from "@/server/db/schema";

import { refreshYouTubeAccessToken } from "./oauth";

export async function getYouTubeAccount(workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.workspaceId, workspaceId))
    .limit(1);
  if (!row || row.platform !== "YT") return null;
  return row;
}

export async function getYouTubeAccessToken(workspaceId: string) {
  const account = await getYouTubeAccount(workspaceId);
  if (!account) return null;

  const refreshToken = decryptSecret(account.refreshTokenEnc);
  const expiresAt = account.expiresAt?.getTime() ?? 0;
  const stillValid = account.accessTokenEnc && expiresAt > Date.now() + 60_000;

  if (stillValid && account.accessTokenEnc) {
    return decryptSecret(account.accessTokenEnc);
  }

  const refreshed = await refreshYouTubeAccessToken(refreshToken);
  const db = getDb();
  await db
    .update(connectedAccounts)
    .set({
      accessTokenEnc: encryptSecret(refreshed.access_token),
      refreshTokenEnc: refreshed.refresh_token
        ? encryptSecret(refreshed.refresh_token)
        : account.refreshTokenEnc,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      scopes: refreshed.scope ?? account.scopes,
      updatedAt: new Date(),
    })
    .where(eq(connectedAccounts.id, account.id));

  return refreshed.access_token;
}

export async function upsertYouTubeAccount(input: {
  workspaceId: string;
  channelId: string;
  channelTitle: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scopes?: string;
}) {
  const db = getDb();
  const id = `yt-${input.workspaceId}`;
  const values = {
    id,
    workspaceId: input.workspaceId,
    platform: "YT",
    externalAccountId: input.channelId,
    accountLabel: input.channelTitle,
    accessTokenEnc: encryptSecret(input.accessToken),
    refreshTokenEnc: encryptSecret(input.refreshToken),
    expiresAt: new Date(Date.now() + input.expiresIn * 1000),
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