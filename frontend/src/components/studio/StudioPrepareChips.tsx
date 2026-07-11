import type { DraftPost } from "@/lib/composer-draft";
import {
  isCaptionReady,
  prepareReadiness,
  type PrepareField,
} from "@/lib/studio-layout";
import { cn } from "@/lib/utils";

const CHIPS: Array<{ id: PrepareField; label: string; title: string }> = [
  { id: "transcript", label: "Script", title: "Transcript" },
  { id: "cta", label: "CTA", title: "Call to action" },
  { id: "title", label: "Title", title: "Title" },
  { id: "caption", label: "Cap", title: "Caption" },
  { id: "hashtags", label: "Tags", title: "Hashtags" },
];

/**
 * At-a-glance prepare progress on a reel card.
 */
export function StudioPrepareChips({
  draft,
  className,
}: {
  draft: DraftPost;
  className?: string;
}) {
  const ready = prepareReadiness(draft);
  const scheduleReady = isCaptionReady(draft);

  return (
    <div
      data-testid={`studio-prepare-chips-${draft.id}`}
      className={cn("flex flex-wrap items-center gap-1", className)}
    >
      {CHIPS.map((c) => {
        const on = ready[c.id];
        return (
          <span
            key={c.id}
            title={on ? `${c.title} ready` : `${c.title} missing`}
            className={cn(
              "rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.04em] transition-colors duration-150",
              on
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground/70",
            )}
          >
            {c.label}
          </span>
        );
      })}
      {scheduleReady ? (
        <span
          title="Caption + hashtags — ready to schedule"
          className="rounded border border-success/40 bg-success/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.04em] text-success"
        >
          Ready
        </span>
      ) : null}
    </div>
  );
}
