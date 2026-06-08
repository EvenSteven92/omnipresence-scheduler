import { eq } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/server/db/client";
import { connectedAccounts, youtubeChannelSnapshots } from "@/server/db/schema";
import type { ConnectionStatus, Platform } from "@/lib/mock-data";
import type { PlatformConnectionRow } from "@/lib/workspaces/types";
import { DEFAULT_WORKSPACE_ID } from "@/server/youtube/config";

const LIVE_PLATFORMS: Platform[] = ["YT"];

export interface WorkspaceAccountsStatus {
  livePlatforms: Platform[];
  connections: PlatformConnectionRow[];
  youtube: {
    connected: boolean;
    channelTitle?: string;
    channelId?: string;
    syncedAt?: string;
  };
}

export async function getWorkspaceAccountsStatus(
  workspaceId = DEFAULT_WORKSPACE_ID,
): Promise<WorkspaceAccountsStatus> {
  if (!isDatabaseConfigured()) {
    return {
      livePlatforms: LIVE_PLATFORMS,
      connections: LIVE_PLATFORMS.map((platform) => ({ platform, status: "disconnected" })),
      youtube: { connected: false },
    };
  }

  const db = getDb();
  const accounts = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.workspaceId, workspaceId));

  const [channel] = await db
    .select()
    .from(youtubeChannelSnapshots)
    .where(eq(youtubeChannelSnapshots.workspaceId, workspaceId))
    .limit(1);

  const youtubeAccount = accounts.find((a) => a.platform === "YT");
  const youtubeConnected = Boolean(youtubeAccount && channel);

  const connections: PlatformConnectionRow[] = LIVE_PLATFORMS.map((platform) => {
    if (platform === "YT") {
      return {
        platform,
        status: (youtubeConnected ? "ok" : "disconnected") satisfies ConnectionStatus,
      };
    }
    return { platform, status: "disconnected" };
  });

  return {
    livePlatforms: LIVE_PLATFORMS,
    connections,
    youtube: {
      connected: youtubeConnected,
      channelTitle: channel?.channelTitle,
      channelId: channel?.channelId,
      syncedAt: channel?.syncedAt?.toISOString(),
    },
  };
}