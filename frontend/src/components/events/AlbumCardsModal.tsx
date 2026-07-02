import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { StreamContentCard } from "@/components/ui/StreamContentCard";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import {
  collectEventMedia,
  eventKindLabel,
  eventMediaToCardPost,
  type EventMediaItem,
} from "@/lib/events/display";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent, WorkspaceProfile } from "@/lib/workspaces/types";

function mediaToStreamPost(item: EventMediaItem, eventId: string): ScheduledPost {
  const base = eventMediaToCardPost(item);
  const platformTimes =
    item.date && item.platforms.length > 0
      ? Object.fromEntries(item.platforms.map((p) => [p, item.date!]))
      : undefined;
  return {
    ...base,
    eventId,
    platformTimes,
    date: item.date ?? base.date,
  };
}

export function AlbumCardsModal({
  event,
  workspace,
  workspaceId,
  onClose,
}: {
  event: ContentEvent;
  workspace: WorkspaceProfile;
  workspaceId: WorkspaceProfile["id"];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { resolveEventId } = useEventAssociations(workspaceId);

  const items = useMemo(
    () => collectEventMedia(workspace, event.id, { resolveEventId }),
    [workspace, event.id, resolveEventId],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function openCard(item: EventMediaItem) {
    onClose();
    navigate({
      to: "/card/$cardId",
      params: { cardId: item.id },
      search: { from: "album" },
    });
  }

  return (
    <div
      onClick={onClose}
      data-testid="album-cards-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-[2px] sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(90vh,720px)] w-full max-w-[640px] flex-col overflow-hidden rounded-lg border-[1.5px] border-foreground bg-background shadow-[4px_4px_0_0_var(--color-foreground)]"
      >
        <div className="relative shrink-0 border-b-[1.5px] border-foreground/15 px-5 py-5 pr-14">
          <p className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.1em] text-accent">
            {eventKindLabel(event.kind)}
          </p>
          <h2 className="mt-1.5 font-display text-[1.375rem] font-bold leading-snug text-foreground">
            {event.title}
          </h2>
          {event.description ? (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            data-testid="album-cards-modal-close"
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md border-[1.5px] border-foreground bg-card p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No cards in this album yet. Schedule content and link it to this album from the
              composer.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <StreamContentCard
                  key={item.id}
                  post={mediaToStreamPost(item, event.id)}
                  testId={`album-card-${item.id}`}
                  onOpen={() => openCard(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}