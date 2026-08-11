import { createFileRoute } from "@tanstack/react-router";

/** Local-only: YouTube OAuth + DB storage removed. */
export const Route = createFileRoute("/api/accounts/youtube/connect")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { detail: "Local-only mode — YouTube OAuth is not available without a cloud DB" },
          { status: 503 },
        ),
    },
  },
});
