import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Compose route — Studio whiteboard is the single prepare/schedule surface. */
export const Route = createFileRoute("/scheduler")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
});
