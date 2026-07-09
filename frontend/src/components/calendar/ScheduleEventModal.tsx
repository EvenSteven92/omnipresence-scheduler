import { useEffect, useMemo, useState } from "react";
import { X as XIcon } from "lucide-react";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent, ContentEventKind } from "@/lib/workspaces/types";
import { eventKindLabel } from "@/lib/events/display";
import { createEventFromInput, type CreateEventInput } from "@/lib/events/create";
import { toDateInputValue, toTimeInputValue } from "@/lib/schedule-engine";
import { UnassignedMediaPicker } from "@/components/events/UnassignedMediaPicker";

const EVENT_KINDS: ContentEventKind[] = [
  "sunday_sermon",
  "worship_night",
  "youth",
  "campaign",
  "conference",
  "other",
];

const fieldClass =
  "w-full rounded-sm border border-border bg-background/60 px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none";

/** Create event album — name, description, date, time, optional media association. */
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canCreate = title.trim().length > 0 && eventDate.length > 0 && eventTime.length > 0;

  const previewLabel = useMemo(() => {
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

  return (
    <div
      onClick={onClose}
      data-testid="schedule-event-modal"
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col modal-shell overflow-hidden"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="text-sm font-medium text-foreground">New event</div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Create an event album — sermon, worship night, campaign, etc. Associate media now or
              later from New Post.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="shrink-0 rounded-sm border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <label className="block space-y-1.5">
            <span className="label-mono text-[0.5rem] text-muted-foreground">name</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sunday Service — Week 19"
              data-testid="event-name-input"
              autoFocus
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">
              Short description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sermon, highlight reel, quote cards, and story clips."
              data-testid="event-description-input"
              rows={2}
              className={`${fieldClass} resize-y leading-relaxed`}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="label-mono text-[0.5rem] text-muted-foreground">date</span>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                data-testid="event-date-input"
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="label-mono text-[0.5rem] text-muted-foreground">time</span>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                data-testid="event-time-input"
                className={fieldClass}
              />
            </label>
          </div>

          {previewLabel ? (
            <p className="rounded-sm border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="label-mono text-[0.45rem] text-muted-foreground">
                scheduled_for{" "}
              </span>
              <span className="font-medium text-foreground">{previewLabel}</span>
            </p>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">
              Event type
            </span>
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

          <UnassignedMediaPicker
            scheduledPosts={scheduledPosts}
            publishedPosts={publishedPosts}
            isAssociated={isAssociated}
            selectedIds={selectedMedia}
            onToggle={toggleMedia}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-action"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canCreate}
            onClick={handleCreate}
            data-testid="create-event-btn"
            className="btn-action-primary btn-action disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create event
          </button>
        </div>
      </div>
    </div>
  );
}
