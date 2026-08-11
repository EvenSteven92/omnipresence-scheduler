import { createFileRoute } from "@tanstack/react-router";

/** Local-only: Meta OAuth + DB storage removed. */
export const Route = createFileRoute("/api/accounts/meta/connect")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { detail: "Local-only mode — Meta OAuth is not available without a cloud DB" },
          { status: 503 },
        ),
    },
  },
});
