import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — Clients is the personal ops settings surface. */
export const Route = createFileRoute("/workspaces")({
  beforeLoad: () => {
    throw redirect({ to: "/clients" });
  },
});
