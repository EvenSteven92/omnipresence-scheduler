import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/accounts/youtube/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToWorker(request, "/api/accounts/youtube/callback"),
    },
  },
});
