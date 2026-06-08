import { createFileRoute } from "@tanstack/react-router";

import { requireTeamSession } from "@/server/team-auth";

export const Route = createFileRoute("/api/team/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return Response.json({ authed: requireTeamSession(request) });
      },
    },
  },
});