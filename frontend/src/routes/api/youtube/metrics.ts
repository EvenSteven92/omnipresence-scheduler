import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/youtube/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToWorker(request, "/api/youtube/metrics"),
    },
  },
});
