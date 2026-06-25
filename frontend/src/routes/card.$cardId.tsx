import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/card/$cardId")({
  component: CardDetailPlaceholder,
});

function CardDetailPlaceholder() {
  return null;
}