import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Schedule route — destinations & times live on Studio cards. */
export const Route = createFileRoute("/schedule")({
  beforeLoad: () => {
    throw redirect({ to: "/studio" });
  },
});
