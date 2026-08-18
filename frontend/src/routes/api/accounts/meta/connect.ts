import { createFileRoute } from "@tanstack/react-router";
import { proxyToWorker } from "@/server/ops/proxy";

export const Route = createFileRoute("/api/accounts/meta/connect")({
  server: {
    handlers: {
      GET: async ({ request }) => proxyToWorker(request, "/api/accounts/meta/connect"),
    },
  },
});
