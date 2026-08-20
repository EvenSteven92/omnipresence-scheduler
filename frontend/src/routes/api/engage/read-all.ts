import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/engage/read-all")({
  server: {
    handlers: {
      POST: async ({ request }) => proxyToWorker(request, "/api/engage/read-all"),
    },
  },
});
