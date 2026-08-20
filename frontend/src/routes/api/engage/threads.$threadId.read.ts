import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/engage/threads/$threadId/read")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        proxyToWorker(request, `/api/engage/threads/${params.threadId}/read`),
    },
  },
});
