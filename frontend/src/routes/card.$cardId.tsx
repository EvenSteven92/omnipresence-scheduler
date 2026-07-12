/**
 * Single-card detail retired. Redirect to owning board or Boards library.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveCardDestination } from "@/lib/card-navigation";
import {
  DEFAULT_WORKSPACE_ID,
  readStoredWorkspaceId,
} from "@/lib/workspaces";

export const Route = createFileRoute("/card/$cardId")({
  beforeLoad: ({ params }) => {
    const workspaceId = readStoredWorkspaceId() ?? DEFAULT_WORKSPACE_ID;
    const dest = resolveCardDestination(workspaceId, params.cardId);
    if (dest.kind === "board") {
      throw redirect({
        to: "/studio",
        search: {
          board: dest.boardId,
          focusCard: dest.cardId,
        },
      });
    }
    throw redirect({
      to: "/studio",
      search: {
        library: "cards",
        picker: "1",
        q: params.cardId,
      },
    });
  },
  component: () => null,
});
