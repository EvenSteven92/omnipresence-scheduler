import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/engage/unread-count")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToWorker(request, "/api/engage/unread-count"),
    },
  },
});
