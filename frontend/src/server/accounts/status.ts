import { eq } from "drizzle-orm";

import { getDb, isDatabaseConfigured } from "@/server/db/client";
import {
  connectedAccounts,
  facebookPageSnapshots,
  instagramAccountSnapshots,
  youtubeChannelSnapshots,
} from "@/server/db/schema";
import type { ConnectionStatus, Platform } from "@/lib/mock-data";
import type { PlatformConnectionRow } from "@/lib/workspaces/types";
import { DEFAULT_WORKSPACE_ID } from "@/server/youtube/config";

const LIVE_PLATFORMS: Platform[] = ["YT", "FB", "IG"];

export interface WorkspaceAccountsStatus {
  livePlatforms: Platform[];
  connections: PlatformConnectionRow[];
  youtube: {
    connected: boolean;
    channelTitle?: string;
    channelId?: string;
    syncedAt?: string;
  };
  meta: {
    facebook: {
      connected: boolean;
      pageName?: string;
      pageId?: string;
      syncedAt?: string;
    };
    instagram: {
      connected: boolean;
      username?: string;
      igUserId?: string;
      syncedAt?: string;
    };
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
      meta: {
        facebook: { connected: false },
        instagram: { connected: false },
      },
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

  const [fbPage] = await db
    .select()
    .from(facebookPageSnapshots)
    .where(eq(facebookPageSnapshots.workspaceId, workspaceId))
    .limit(1);

  const [igAccount] = await db
    .select()
    .from(instagramAccountSnapshots)
    .where(eq(instagramAccountSnapshots.workspaceId, workspaceId))
    .limit(1);

  const youtubeAccount = accounts.find((a) => a.platform === "YT");
  const facebookAccount = accounts.find((a) => a.platform === "FB");
  const instagramAccount = accounts.find((a) => a.platform === "IG");

  const youtubeConnected = Boolean(youtubeAccount && channel);
  const facebookConnected = Boolean(facebookAccount && fbPage);
  const instagramConnected = Boolean(instagramAccount && igAccount);

  const connections: PlatformConnectionRow[] = LIVE_PLATFORMS.map((platform) => {
    if (platform === "YT") {
      return {
        platform,
        status: (youtubeConnected ? "ok" : "disconnected") satisfies ConnectionStatus,
      };
    }
    if (platform === "FB") {
      return {
        platform,
        status: (facebookConnected ? "ok" : "disconnected") satisfies ConnectionStatus,
      };
    }
    if (platform === "IG") {
      return {
        platform,
        status: (instagramConnected ? "ok" : "disconnected") satisfies ConnectionStatus,
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
    meta: {
      facebook: {
        connected: facebookConnected,
        pageName: fbPage?.pageName,
        pageId: fbPage?.pageId,
        syncedAt: fbPage?.syncedAt?.toISOString(),
      },
      instagram: {
        connected: instagramConnected,
        username: igAccount?.username,
        igUserId: igAccount?.igUserId,
        syncedAt: igAccount?.syncedAt?.toISOString(),
      },
    },
  };
}
