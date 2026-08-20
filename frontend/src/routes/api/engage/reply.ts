import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/engage/reply")({
  server: {
    handlers: {
      POST: async ({ request }) => proxyToWorker(request, "/api/engage/reply"),
    },
  },
});
