import { createFileRoute } from "@tanstack/react-router";

/**
 * Local ops health. Until the Mac Launch Agent worker is wired, this reports
 * "scaffold" so the Overview can show an honest Attention item.
 */
export const Route = createFileRoute("/api/ops/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          online: false,
          detail:
            "Publish/inbox worker not installed yet — Phase 1 scaffold. UI prefs (armed / kill-switch) are saved locally.",
          version: "scaffold-0",
          lastTickAt: null,
        }),
    },
  },
});
