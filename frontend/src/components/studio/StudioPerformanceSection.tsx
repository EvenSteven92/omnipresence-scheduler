import { ChevronDown } from "lucide-react";
import { fmtCompact } from "@/components/PerformanceMetricCounters";
import { cardPerformance } from "@/lib/card-detail";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { isPublishedPost, type PostDetailSource } from "@/lib/post-detail";
import { cn } from "@/lib/utils";

export function StudioPerformanceSection({
  open,
  post,
  onToggle,
}: {
  open: boolean;
  post: ScheduledPost | PublishedPost | null | undefined;
  onToggle: () => void;
}) {
  const source = post as PostDetailSource | null | undefined;
  const perf = source
    ? cardPerformance(source)
    : {
        published: false,
        views: "—",
        engagement: "—",
        likes: "—",
        shares: "—",
      };
  const published =
    source &&
    (isPublishedPost(source) ||
      (post && "status" in post && post.status === "published"));

  return (
    <section
      className="border-t border-line"
      data-testid="studio-performance-section"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Performance
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
            className="px-3 pb-3"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {!published ? (
              <p className="text-xs text-muted-foreground">
                Metrics appear after go-live.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["Views", perf.views],
                    ["Engagement", perf.engagement],
                    ["Likes", perf.likes],
                    ["Shares", perf.shares],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-line bg-paper-2 px-2 py-1.5"
                  >
                    <div className="font-display text-sm font-bold text-foreground">
                      {typeof value === "number" ? fmtCompact(value) : value}
                    </div>
                    <div className="font-mono text-[0.55rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
