import { useEffect } from "react";
import { X as XIcon } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { EventAssociationPicker } from "@/components/events/EventAssociationPicker";

export function EventAssociateModal({
  post,
  events,
  currentEventId,
  onAssociate,
  onClose,
}: {
  post: ScheduledPost;
  events: ContentEvent[];
  currentEventId?: string;
  onAssociate: (eventId: string | undefined) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      data-testid="event-associate-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md modal-shell overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b border-foreground px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Associate with event</div>
            <p className="mt-2 text-sm font-semibold text-foreground">{post.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Link this file to a ministry event — sermon, worship night, etc.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="shrink-0 rounded-sm border border-foreground bg-background p-1.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>
        <div className="p-5">
          <EventAssociationPicker
            events={events}
            value={currentEventId}
            onChange={(eventId) => {
              onAssociate(eventId);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
