import { Link } from "@tanstack/react-router";

export function QueueCalendarToggle({ active = "queue" }: { active?: "queue" | "calendar" }) {
  return (
    <div
      className="flex overflow-hidden rounded-md border border-foreground"
      data-testid="queue-calendar-toggle"
    >
      <Link
        to="/"
        className={`px-3.5 py-2 font-mono text-[0.6875rem] font-semibold uppercase transition-colors hover:bg-secondary ${
          active === "queue" ? "bg-foreground text-background" : "text-foreground"
        }`}
      >
        Queue
      </Link>
      <Link
        to="/calendar"
        className={`border-l border-foreground px-3.5 py-2 font-mono text-[0.6875rem] font-semibold uppercase transition-colors hover:bg-secondary ${
          active === "calendar" ? "bg-foreground text-background" : "text-foreground"
        }`}
      >
        Calendar
      </Link>
    </div>
  );
}
