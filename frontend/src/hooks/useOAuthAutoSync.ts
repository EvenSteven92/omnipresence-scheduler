import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WorkspaceId } from "@/lib/workspaces/types";

/** After OAuth redirect, automatically pull metrics once (no manual Sync click). */
export function useOAuthAutoSync(
  workspaceId: WorkspaceId,
  params: { youtube?: string | null; meta?: string | null },
  teamAuthed: boolean,
) {
  const queryClient = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (!teamAuthed || ran.current) return;
    const shouldSyncYt = params.youtube === "connected";
    const shouldSyncMeta = params.meta === "connected" || params.meta === "partial";
    if (!shouldSyncYt && !shouldSyncMeta) return;

    ran.current = true;

    async function run() {
      if (shouldSyncYt) {
        await fetch(`/api/youtube/sync?workspace=${workspaceId}`, {
          method: "POST",
          credentials: "include",
        }).catch(() => null);
      }
      if (shouldSyncMeta) {
        await fetch(`/api/meta/sync?workspace=${workspaceId}`, {
          method: "POST",
          credentials: "include",
        }).catch(() => null);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["youtube-metrics", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["meta-metrics", workspaceId] }),
        queryClient.invalidateQueries({ queryKey: ["platform-connections", workspaceId] }),
      ]);
    }

    void run();
  }, [workspaceId, params.youtube, params.meta, teamAuthed, queryClient]);
}
