import { useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Layers, Plus, X as XIcon } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { formatEventMeta } from "@/lib/events/display";
import { ContentCardChip } from "@/components/post/ContentCardChip";
import { contentCardAnchorDate } from "@/lib/scheduled-post-display";

function groupQueuedPostsByDay(posts: ScheduledPost[]): { date: Date; posts: ScheduledPost[] }[] {
  const byDay = new Map<string, ScheduledPost[]>();

  for (const post of posts) {
    const date = contentCardAnchorDate(post);
    const key = date.toDateString();
    const arr = byDay.get(key) ?? [];
    arr.push(post);
    byDay.set(key, arr);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => +new Date(a) - +new Date(b))
    .map(([key, dayPosts]) => ({
      date: new Date(key),
      posts: dayPosts.sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b)),
    }));
}

export function EventQueuedPostsModal({
  event,
  posts,
  onSelectPost,
  onClose,
}: {
  event: ContentEvent;
  posts: ScheduledPost[];
  onSelectPost: (post: ScheduledPost) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const postsByDay = useMemo(() => groupQueuedPostsByDay(posts), [posts]);

  return (
    <div
      onClick={onClose}
      data-testid="event-queued-posts-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-accent/30 bg-accent/5">
                <Layers className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
              </span>
              <div className="label-mono">event_album · queued</div>
            </div>
            <h2 className="mt-3 text-base font-semibold text-foreground">{event.title}</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatEventMeta(event.date, event.kind)}
              {" · "}
              {posts.length === 0
                ? "No cards queued for this album yet."
                : `${posts.length} content card${posts.length === 1 ? "" : "s"} yet to publish.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="event-queued-posts-close"
            aria-label="close"
            className="shrink-0 rounded-sm border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Associate content cards from the calendar or New Post flow to fill this event album.
              </p>
              <Link
                to="/scheduler"
                onClick={onClose}
                data-testid="event-queued-new-post"
                className="inline-flex items-center gap-1.5 rounded-sm border border-accent/60 bg-accent/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20"
              >
                <Plus className="h-3 w-3" />
                New_Post
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {postsByDay.map(({ date, posts: dayPosts }) => {
                const dayLabel = date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                });

                return (
                  <section
                    key={date.toDateString()}
                    data-testid={`event-queued-day-${date.toDateString()}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-2">
                      <span className="text-sm font-semibold text-foreground">{dayLabel}</span>
                      <span className="label-mono text-muted-foreground">
                        {dayPosts.length} card{dayPosts.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {dayPosts.map((post) => (
                        <ContentCardChip
                          key={post.id}
                          post={post}
                          layout="rail"
                          associated
                          onOpen={() => onSelectPost(post)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-[0.6rem] leading-relaxed text-muted-foreground">
            Pick a card for details — your full event album is one click away.
          </p>
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border bg-background px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
          >
            Open_album
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
