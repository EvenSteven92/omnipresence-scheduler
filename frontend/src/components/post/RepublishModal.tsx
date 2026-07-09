import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarClock, Repeat2, X as XIcon } from "lucide-react";
import type { PostDetailSource } from "@/lib/post-detail";
import { isPublishedPost } from "@/lib/post-detail";
import { draftFromPostDetail, republishSourceLabel, stashRepublishDraft } from "@/lib/republish";
import { useWorkspace } from "@/lib/workspace-context";

/**
 * Scaffold republish flow — clones the card into the composer for fresh publish times.
 */
export function RepublishModal({
  post,
  eventId,
  onClose,
}: {
  post: PostDetailSource;
  eventId?: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const published = isPublishedPost(post);
  const source = republishSourceLabel(post);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function continueInComposer() {
    const draft = draftFromPostDetail(post, {
      allowedPlatforms: workspace.platforms,
      eventId,
    });
    stashRepublishDraft(workspaceId, draft);
    onClose();
    // Router history state is dynamic at runtime; the scheduler reads this back via a cast.
    navigate({ to: "/scheduler", state: { republishDraft: draft } as never });
  }

  return (
    <div
      onClick={onClose}
      data-testid="republish-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md modal-shell overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b-[1.5px] border-foreground px-5 py-4">
          <div className="min-w-0">
            <div className="text-title">Republish</div>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              {published ? "Schedule this content again" : "Queue a new publish wave"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="republish-close"
            aria-label="close"
            className="shrink-0 rounded-sm border-[1.5px] border-foreground bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {published
              ? "We'll copy this live card into the composer as a new draft. Pick fresh publish times and platforms before saving — the original post stays on your calendar and analytics."
              : "We'll copy this scheduled card into the composer as a new draft. Set new publish times before saving — your existing queue entry stays unchanged until you replace it."}
          </p>

          <ul className="space-y-2 border-[1.5px] border-foreground bg-paper-2 px-4 py-3 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <Repeat2 className="mt-0.5 h-3 w-3 shrink-0 text-accent" strokeWidth={1.75} />
              <span>Same file, caption, and event album link</span>
            </li>
            <li className="flex items-start gap-2">
              <CalendarClock className="mt-0.5 h-3 w-3 shrink-0 text-accent" strokeWidth={1.75} />
              <span>You choose new publish times in the composer</span>
            </li>
          </ul>

          <p className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground/80">
            source_{source} · {post.platforms.length}_platform
            {post.platforms.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t-[1.5px] border-foreground px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-action"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={continueInComposer}
            data-testid="republish-continue"
            className="btn-action-primary btn-action"
          >
            <Repeat2 className="h-3 w-3" strokeWidth={1.75} />
            Continue_in_composer
          </button>
        </div>
      </div>
    </div>
  );
}
