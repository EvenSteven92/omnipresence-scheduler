/**
 * Card library — archive of scheduled / live posts for single-card detail.
 * Not the Studio board flow.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { StreamContentCard } from "@/components/ui/StreamContentCard";
import { useWorkspace } from "@/lib/workspace-context";
import type { ScheduledPost } from "@/lib/mock-data";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — TORCC OmniPresence" },
      {
        name: "description",
        content: "Archive of cards — open one to edit, refine platforms, or reuse.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { workspace } = useWorkspace();
  const navigate = useNavigate();

  const cards = useMemo(() => {
    const scheduled = workspace.scheduledPosts;
    const published = workspace.publishedPosts.map(
      (p): ScheduledPost => ({
        id: p.id,
        title: p.title,
        platforms: p.platforms,
        date: p.date,
        platformTimes: p.platformTimes,
        status: "published",
        eventId: p.eventId,
        caption: p.caption,
        hashtags: p.hashtags,
        transcript: p.transcript,
        callToAction: p.callToAction,
        previewUrl: p.previewUrl,
        dropboxUrl: p.dropboxUrl,
      }),
    );
    // Prefer scheduled row when ids collide
    const byId = new Map<string, ScheduledPost>();
    published.forEach((p) => byId.set(p.id, p));
    scheduled.forEach((p) => byId.set(p.id, p));
    return [...byId.values()].sort(
      (a, b) => +new Date(b.date) - +new Date(a.date),
    );
  }, [workspace.scheduledPosts, workspace.publishedPosts]);

  return (
    <div className="page-content">
      <header className="page-header mb-6">
        <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Archive
        </p>
        <h1 className="page-title">Library</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Single cards from the queue and calendar history. Open one to edit
          scheduled copy, refine per-platform publishes, or duplicate & reuse.
          Board batch work stays in Boards.
        </p>
      </header>

      {cards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-12 text-center text-sm text-muted-foreground">
          No cards yet. Schedule from{" "}
          <Link to="/studio" className="font-semibold underline">
            Boards
          </Link>{" "}
          or the queue.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((post) => (
            <li key={post.id}>
              <StreamContentCard
                post={post}
                onOpen={() => {
                  void navigate({
                    to: "/card/$cardId",
                    params: { cardId: post.id },
                    search: { from: "library" },
                  });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
