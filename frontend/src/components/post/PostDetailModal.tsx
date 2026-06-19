import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, X as XIcon, ExternalLink, Pencil, BarChart3, Repeat2 } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import { ContentPublishSchedule } from "@/components/post/ContentPublishSchedule";
import { PublishTimesAgenda } from "@/components/post/PublishTimesAgenda";
import { useWorkspace } from "@/lib/workspace-context";
import { mergeWorkspaceEvents, useCustomEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import {
  contentCardAnchorDate,
  contentCardPublishSpread,
} from "@/lib/scheduled-post-display";
import {
  isPublishedPost,
  postDetailFallbackIso,
  postDetailPlatforms,
  postDetailPlatformTimes,
  showPublishCalendar,
  type PostDetailSource,
} from "@/lib/post-detail";
import { getEventById, formatEventMeta } from "@/lib/events/display";
import { Link, useNavigate } from "@tanstack/react-router";
import { draftFromPostDetail, stashRepublishDraft } from "@/lib/republish";
import { toCalendarDateSearch } from "@/lib/calendar-day-click";
import { Layers } from "lucide-react";
import { RepublishModal } from "@/components/post/RepublishModal";

export function PostDetailModal({
  post,
  onClose,
}: {
  post: PostDetailSource;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const workspaceEvents = mergeWorkspaceEvents(workspace.events, customEvents);
  const { resolveEventId } = useEventAssociations(workspaceId);
  const published = isPublishedPost(post);
  const useCalendar = showPublishCalendar(post);
  const platforms = postDetailPlatforms(post);
  const platformTimes = postDetailPlatformTimes(post);
  const fallbackIso = postDetailFallbackIso(post);
  const otherScheduled = workspace.scheduledPosts.filter((p) => p.id !== post.id);

  const scheduled = published ? null : (post as ScheduledPost);
  const anchor = published ? new Date(fallbackIso) : contentCardAnchorDate(scheduled!);
  const spread = published ? null : contentCardPublishSpread(scheduled!);
  const linkedEventId = useMemo(
    () => resolveEventId(post) ?? post.eventId,
    [post, resolveEventId],
  );

  const linkedEvent = useMemo(
    () => (linkedEventId ? getEventById(workspaceEvents, linkedEventId) : undefined),
    [linkedEventId, workspaceEvents],
  );

  const [republishOpen, setRepublishOpen] = useState(false);

  function openInCalendar() {
    onClose();
    navigate({
      to: "/calendar",
      search: { date: toCalendarDateSearch(anchor) },
    });
  }

  function openInAnalytics() {
    onClose();
    navigate({ to: "/analytics" });
  }

  function editPost() {
    const draft = draftFromPostDetail(post, {
      allowedPlatforms: workspace.platforms,
      eventId: linkedEventId,
    });
    stashRepublishDraft(workspaceId, draft);
    onClose();
    navigate({ to: "/scheduler" });
  }

  return (
    <div
      onClick={onClose}
      data-testid="post-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-sm border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm border border-foreground/40 px-2 py-0.5 text-body-sm font-medium text-foreground">
                Content card
              </span>
              <span
                className={`rounded-sm border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] ${
                  published
                    ? "border-success/60 text-success"
                    : "border-accent text-accent"
                }`}
              >
                {published ? "published" : scheduled!.status}
              </span>
              <span className="label-mono">
                {anchor.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="mt-2 text-base text-foreground">{post.title}</div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {platforms.length} platform publish{platforms.length === 1 ? "" : "es"}
              {spread ? ` · ${spread}` : published ? " · live" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            data-testid="post-detail-close"
            className="rounded-sm border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="close"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="flex aspect-video items-center justify-center border-b border-border bg-background/60">
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-6 w-6" strokeWidth={1.25} />
            <span className="text-body-sm text-muted-foreground">One file · many networks</span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {linkedEvent ? (
            <Link
              to="/events/$eventId"
              params={{ eventId: linkedEvent.id }}
              className="flex items-center justify-between gap-3 rounded-sm border border-accent/40 bg-accent/5 px-4 py-3 transition-colors hover:bg-accent/10"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Layers className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.75} />
                <div className="min-w-0">
                  <div className="text-eyebrow">Event album</div>
                  <div className="truncate text-xs font-semibold text-foreground">
                    {linkedEvent.title}
                  </div>
                </div>
              </div>
              <span className="shrink-0 label-mono text-[0.5rem] text-accent">
                {formatEventMeta(linkedEvent.date, linkedEvent.kind)}
              </span>
            </Link>
          ) : null}

          {useCalendar ? (
            <ContentPublishSchedule
              platforms={platforms}
              proposedTimes={platformTimes}
              fallbackIso={fallbackIso}
              scheduledPosts={otherScheduled}
              readOnlyCalendar
            />
          ) : (
            <PublishTimesAgenda
              platforms={platforms}
              platformTimes={platformTimes}
              fallbackIso={fallbackIso}
              mode={published ? "published" : "scheduled"}
            />
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setRepublishOpen(true)}
              data-testid="post-detail-republish"
              className="flex items-center gap-1.5 rounded-sm border border-accent/60 bg-accent/10 px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20"
            >
              <Repeat2 className="h-3 w-3" strokeWidth={1.75} />
              Republish
            </button>
            {published ? (
              <button
                type="button"
                onClick={openInAnalytics}
                data-testid="post-detail-view-analytics"
                className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
              >
                <BarChart3 className="h-3 w-3" />
                View_in_analytics
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={openInCalendar}
                  data-testid="post-detail-open-calendar"
                  className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open_in_calendar
                </button>
                <button
                  type="button"
                  onClick={editPost}
                  data-testid="post-detail-edit-post"
                  className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Pencil className="h-3 w-3" />
                  Edit_Post
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {republishOpen ? (
        <RepublishModal
          post={post}
          eventId={linkedEventId}
          onClose={() => setRepublishOpen(false)}
        />
      ) : null}
    </div>
  );
}