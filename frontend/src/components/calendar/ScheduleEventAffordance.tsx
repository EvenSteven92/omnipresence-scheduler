import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CREATE } from "@/lib/create-actions";

/** Solid control to create a new event on a calendar day. */
export function ScheduleEventAffordance({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      data-testid="schedule-event-affordance"
      onClick={onClick}
      className="w-full"
    >
      <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} />
      {CREATE.event}
    </Button>
  );
}
