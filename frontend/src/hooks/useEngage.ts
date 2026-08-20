import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceId } from "@/lib/workspaces/types";

export type EngageThread = {
  id: string;
  platform: string;
  kind: string;
  externalId: string;
  parentExternalId: string | null;
  postExternalId: string | null;
  postTitle: string | null;
  authorName: string | null;
  authorId: string | null;
  body: string | null;
  unread: boolean;
  createdAt: string | null;
  syncedAt: string;
};

export function useEngageUnread(clientId: WorkspaceId) {
  return useQuery({
    queryKey: ["engage-unread", clientId],
    queryFn: async () => {
      const res = await fetch(
        `/api/engage/unread-count?workspace=${encodeURIComponent(clientId)}`,
        { credentials: "include" },
      );
      if (!res.ok) return { unread: 0 };
      return (await res.json()) as { unread: number };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useEngageThreads(
  clientId: WorkspaceId,
  opts?: { platform?: string; unreadOnly?: boolean },
) {
  const platform = opts?.platform;
  const unreadOnly = opts?.unreadOnly ?? false;
  return useQuery({
    queryKey: ["engage-threads", clientId, platform ?? "all", unreadOnly],
    queryFn: async () => {
      const params = new URLSearchParams({ workspace: clientId });
      if (platform) params.set("platform", platform);
      if (unreadOnly) params.set("unread", "1");
      const res = await fetch(`/api/engage/threads?${params}`, { credentials: "include" });
      if (!res.ok) {
        return { threads: [] as EngageThread[], unread: 0, clientId };
      }
      return (await res.json()) as {
        threads: EngageThread[];
        unread: number;
        clientId: string;
      };
    },
    refetchInterval: 30_000,
  });
}

export function useEngageActions(clientId: WorkspaceId) {
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["engage-threads", clientId] });
    void qc.invalidateQueries({ queryKey: ["engage-unread", clientId] });
  };

  const sync = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/engage/sync?workspace=${encodeURIComponent(clientId)}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Sync failed");
      return data;
    },
    onSuccess: invalidate,
  });

  const reply = useMutation({
    mutationFn: async (input: { threadId: string; message: string }) => {
      const res = await fetch("/api/engage/reply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, clientId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { detail?: string }).detail ?? "Reply failed");
      return data;
    },
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: async (threadId: string) => {
      await fetch(`/api/engage/threads/${encodeURIComponent(threadId)}/read`, {
        method: "POST",
        credentials: "include",
      });
    },
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/engage/read-all", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
    },
    onSuccess: invalidate,
  });

  return { sync, reply, markRead, markAllRead };
}
