import { ChevronDown } from "lucide-react";
import type { DraftPost } from "@/lib/composer-draft";
import type { Platform, PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { formatPublishWhen } from "@/lib/card-detail";
import { cn } from "@/lib/utils";

function platformTimeIso(
  platform: Platform,
  post: ScheduledPost | PublishedPost | null | undefined,
  draft: DraftPost,
): string | undefined {
  return (
    post?.platformTimes?.[platform] ??
    draft.proposedTimes?.[platform] ??
    (post?.platforms?.includes(platform) ? post.date : undefined)
  );
}

export function StudioCommittedScheduleSection({
  open,
  draft,
  post,
  onToggle,
  onReschedule,
}: {
  open: boolean;
  draft: DraftPost;
  post: ScheduledPost | PublishedPost | null | undefined;
  onToggle: () => void;
  onReschedule?: () => void;
}) {
  const platforms =
    post?.platforms?.length ? post.platforms : draft.platforms;
  const status =
    post && "status" in post && post.status
      ? post.status
      : post && "engagementRate" in post
        ? "published"
        : "scheduled";

  return (
    <section
      className="border-t border-line"
      data-testid="studio-committed-schedule"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Schedule
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className="space-y-2 px-3 pb-3"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {status === "published"
                ? "Live"
                : status === "failed"
                  ? "Failed"
                  : "Scheduled"}
            </p>
            {platforms.length === 0 ? (
              <p className="text-xs text-muted-foreground">No platforms set.</p>
            ) : (
              <ul className="space-y-1.5">
                {platforms.map((p) => {
                  const iso = platformTimeIso(p, post, draft);
                  const meta = PLATFORMS_BY_SHORT[p];
                  return (
                    <li
                      key={p}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-paper-2 px-2 py-1.5"
                    >
                      <span className="text-caption font-semibold text-foreground">
                        {meta?.full ?? p}
                      </span>
                      <span className="font-mono text-[0.65rem] font-semibold text-muted-foreground">
                        {iso ? formatPublishWhen(iso) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {onReschedule && status !== "published" ? (
              <button
                type="button"
                onClick={onReschedule}
                className="btn-action btn-action-secondary min-h-8 w-full text-caption"
                data-testid="studio-card-reschedule"
              >
                Reschedule
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
