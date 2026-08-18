import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/meta/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToWorker(request, "/api/meta/metrics"),
    },
  },
});
