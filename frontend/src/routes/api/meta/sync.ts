import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/meta/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToWorker(request, "/api/meta/sync"),
      POST: async ({ request }) => proxyToWorker(request, "/api/meta/sync"),
    },
  },
});
