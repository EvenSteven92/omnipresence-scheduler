import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Solid control to schedule a new event album on a calendar day. */
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
      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      New event
    </Button>
  );
}
