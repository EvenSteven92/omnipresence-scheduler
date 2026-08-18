import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceId } from "@/lib/workspaces/types";
import { canAutoPublish, isClientArmed, isClientPublishPaused } from "@/lib/client-ops";

/** Push local schedules to the Mac worker so armed Meta targets can auto-post. */
export async function syncScheduleToWorker(
  clientId: WorkspaceId,
  posts: ScheduledPost[],
): Promise<boolean> {
  try {
    const res = await fetch("/api/posts/schedule", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        posts: posts.map((p) => ({
          id: p.id,
          title: p.title,
          caption: p.caption ?? "",
          hashtags: p.hashtags ?? "",
          dropboxUrl: p.dropboxUrl ?? null,
          previewUrl: p.previewUrl ?? p.dropboxDirectUrl ?? null,
          status: p.status ?? "scheduled",
          armed: canAutoPublish(clientId),
          eventId: p.eventId ?? null,
          platforms: p.platforms,
          platformTimes: p.platformTimes ?? {},
          date: p.date,
        })),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncClientOpsToWorker(clientId: WorkspaceId): Promise<void> {
  try {
    await fetch("/api/posts/client-ops", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        armed: isClientArmed(clientId),
        publishPaused: isClientPublishPaused(clientId),
      }),
    });
  } catch {
    /* worker may be offline */
  }
}
