import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/youtube/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToWorker(request, "/api/youtube/sync"),
      POST: async ({ request }) => proxyToWorker(request, "/api/youtube/sync"),
    },
  },
});
