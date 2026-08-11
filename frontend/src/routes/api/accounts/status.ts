import { createFileRoute } from "@tanstack/react-router";

/** Local-only: OAuth / connected accounts require a cloud DB (removed). */
export const Route = createFileRoute("/api/accounts/status")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          livePlatforms: ["YT", "FB", "IG"],
          connections: [
            { platform: "YT", status: "disconnected" },
            { platform: "FB", status: "disconnected" },
            { platform: "IG", status: "disconnected" },
          ],
          youtube: { connected: false },
          meta: {
            facebook: { connected: false },
            instagram: { connected: false },
          },
        }),
    },
  },
});
