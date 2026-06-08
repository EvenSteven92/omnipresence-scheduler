import { useQuery } from "@tanstack/react-query";

import type { PlatformConnectionRow } from "@/lib/workspaces/types";
import type { Platform } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";

export interface PlatformConnectionsStatus {
  livePlatforms: Platform[];
  connections: PlatformConnectionRow[];
  youtube: {
    connected: boolean;
    channelTitle?: string;
    channelId?: string;
    syncedAt?: string;
  };
}

export function usePlatformConnections(workspaceId: WorkspaceId) {
  return useQuery({
    queryKey: ["platform-connections", workspaceId],
    queryFn: async (): Promise<PlatformConnectionsStatus> => {
      const res = await fetch(`/api/accounts/status?workspace=${workspaceId}`);
      if (!res.ok) {
        return {
          livePlatforms: ["YT"],
          connections: [{ platform: "YT", status: "disconnected" }],
          youtube: { connected: false },
        };
      }
      return res.json() as Promise<PlatformConnectionsStatus>;
    },
    staleTime: 30_000,
  });
}