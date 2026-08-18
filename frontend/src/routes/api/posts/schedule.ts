import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/posts/schedule")({
  server: {
    handlers: {
      POST: async ({ request }) => proxyToWorker(request, "/api/posts/schedule"),
    },
  },
});
