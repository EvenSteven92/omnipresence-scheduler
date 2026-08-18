import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/media/$mediaId")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        proxyToWorker(request, `/api/media/${params.mediaId}`),
    },
  },
});
