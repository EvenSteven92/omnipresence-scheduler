import { useCallback } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-context";

/**
 * Event ↔ card association.
 * Resolves from post.eventId (DB or local). Writes via workspace.associatePost.
 */
export function useEventAssociations(_workspaceId?: string) {
  const { associatePost } = useWorkspace();

  const resolveEventId = useCallback(
    (post: Pick<ScheduledPost, "id" | "eventId">): string | undefined => post.eventId,
    [],
  );

  const isAssociated = useCallback(
    (post: Pick<ScheduledPost, "id" | "eventId">) => Boolean(post.eventId),
    [],
  );

  const associate = useCallback(
    (postId: string, eventId: string | undefined) => {
      void associatePost(postId, eventId);
    },
    [associatePost],
  );

  return { resolveEventId, isAssociated, associate };
}
