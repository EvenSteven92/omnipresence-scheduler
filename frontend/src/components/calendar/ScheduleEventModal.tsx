import { useEffect, useMemo, useState } from "react";
import { ChevronDown, X as XIcon } from "lucide-react";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent, ContentEventKind } from "@/lib/workspaces/types";
import { eventKindLabel } from "@/lib/events/display";
import { createEventFromInput, type CreateEventInput } from "@/lib/events/create";
import { toDateInputValue, toTimeInputValue } from "@/lib/schedule-engine";
import { UnassignedMediaPicker } from "@/components/events/UnassignedMediaPicker";
import { CREATE } from "@/lib/create-actions";
import { cn } from "@/lib/utils";

const EVENT_KINDS: ContentEventKind[] = [
  "sunday_sermon",
  "worship_night",
  "youth",
  "campaign",
  "conference",
  "other",
];

const fieldClass =
  "w-full rounded-lg border border-line bg-paper-2 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * Create a real-world ministry event (Sunday service, worship night, etc.).
 * Modeled on Google Calendar quick-create: title + when first; extras optional.
 */
export function ScheduleEventModal({
  date,
  scheduledPosts,
  publishedPosts,
  isAssociated,
  onCreate,
  onClose,
}: {
  date: Date;
  scheduledPosts: ScheduledPost[];
  publishedPosts: PublishedPost[];
  isAssociated: (post: Pick<ScheduledPost, "id" | "eventId">) => boolean;
  onCreate: (event: ContentEvent, associatePostIds: string[]) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(() => toDateInputValue(date));
  const [eventTime, setEventTime] = useState(() => {
    const t = toTimeInputValue(date.toISOString());
    return t === "00:00" ? "09:00" : t;
  });
  const [kind, setKind] = useState<ContentEventKind>("sunday_sermon");
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(() => new Set());
  const [showLinkPosts, setShowLinkPosts] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canCreate = title.trim().length > 0 && eventDate.length > 0 && eventTime.length > 0;

  const whenSummary = useMemo(() => {
    if (!eventDate || !eventTime) return null;
    const iso = `${eventDate}T${eventTime}:00`;
    const dt = new Date(iso);
    if (Number.isNaN(+dt)) return null;
    return dt.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [eventDate, eventTime]);

  function toggleMedia(postId: string) {
    setSelectedMedia((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function handleCreate() {
    if (!canCreate) return;
    const input: CreateEventInput = {
      title,
      description,
      date: eventDate,
      time: eventTime,
      kind,
    };
    const event = createEventFromInput(input);
    onCreate(event, Array.from(selectedMedia));
  }

  const linkCount = selectedMedia.size;

  return (
    <div
      onClick={onClose}
      data-testid="schedule-event-modal"
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col modal-shell overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-event-title"
      >
        {/* Header — GCal-style: short title, no product essay */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="new-event-title" className="text-base font-semibold text-foreground">
            {CREATE.event}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md border border-line bg-background p-1.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Title — primary focus, like GCal “Add title” */}
          <label className="block">
            <span className="sr-only">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              data-testid="event-name-input"
              autoFocus
              className={cn(
                fieldClass,
                "border-0 border-b border-line bg-transparent px-0 py-2 text-lg font-medium rounded-none shadow-none focus:ring-0 focus:border-primary",
              )}
            />
          </label>

          {/* When — real-world event time, not social publish time */}
          <fieldset className="space-y-2">
            <legend className="text-caption font-semibold text-muted-foreground">When</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="sr-only">Date</span>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  data-testid="event-date-input"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1">
                <span className="sr-only">Time</span>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  data-testid="event-time-input"
                  className={fieldClass}
                />
              </label>
            </div>
            {whenSummary ? (
              <p className="text-xs text-muted-foreground" data-testid="event-when-summary">
                {whenSummary}
              </p>
            ) : null}
          </fieldset>

          {/* Category */}
          <label className="block space-y-1.5">
            <span className="text-caption font-semibold text-muted-foreground">Type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ContentEventKind)}
              data-testid="event-kind-select"
              className={fieldClass}
            >
              {EVENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {eventKindLabel(k)}
                </option>
              ))}
            </select>
          </label>

          {/* Notes — optional, secondary */}
          <label className="block space-y-1.5">
            <span className="text-caption font-semibold text-muted-foreground">
              Notes{" "}
              <span className="font-normal text-muted-foreground/80">(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything the team should know…"
              data-testid="event-description-input"
              rows={2}
              className={`${fieldClass} resize-y leading-relaxed`}
            />
          </label>

          {/* Progressive disclosure — link posts (not front-loaded media jargon) */}
          <div className="rounded-lg border border-line/80 bg-paper-2/40">
            <button
              type="button"
              onClick={() => setShowLinkPosts((v) => !v)}
              data-testid="event-link-posts-toggle"
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground"
              aria-expanded={showLinkPosts}
            >
              <span>
                Link posts{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
                {linkCount > 0 ? (
                  <span className="ml-2 rounded-sm bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-foreground">
                    {linkCount}
                  </span>
                ) : null}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  showLinkPosts && "rotate-180",
                )}
              />
            </button>
            {showLinkPosts ? (
              <div className="border-t border-line px-3 pb-3 pt-2">
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Attach existing posts to this event. You can also link them later from a post or
                  the calendar.
                </p>
                <UnassignedMediaPicker
                  scheduledPosts={scheduledPosts}
                  publishedPosts={publishedPosts}
                  isAssociated={isAssociated}
                  selectedIds={selectedMedia}
                  onToggle={toggleMedia}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button type="button" onClick={onClose} className="btn-action">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={handleCreate}
            data-testid="create-event-btn"
            className="btn-action-primary btn-action disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
