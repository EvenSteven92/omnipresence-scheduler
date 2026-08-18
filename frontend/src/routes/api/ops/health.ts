import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/ops/health")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToWorker(request, "/api/ops/health"),
    },
  },
});
