/**
 * Library retired — cards live in Boards library (Cards filter).
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/library")({
  beforeLoad: () => {
    throw redirect({
      to: "/studio",
      search: { library: "cards", picker: "1" },
    });
  },
  component: () => null,
});
