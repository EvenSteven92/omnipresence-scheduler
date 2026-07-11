import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StudioCaptionSection({
  open,
  caption,
  hashtags,
  busy,
  onToggle,
  onCaption,
  onHashtags,
  onGenerate,
}: {
  open: boolean;
  caption: string;
  hashtags: string;
  busy?: boolean;
  onToggle: () => void;
  onCaption: (v: string) => void;
  onHashtags: (v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <section className="border-t border-line" data-testid="studio-caption-section">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Caption & hashtags
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
          <div className="space-y-2 px-3 pb-3">
            <textarea
              value={caption}
              onChange={(e) => onCaption(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              rows={4}
              className="w-full resize-y rounded-md border border-line bg-paper-2 px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="Caption…"
            />
            <input
              type="text"
              value={hashtags}
              onChange={(e) => onHashtags(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-md border border-line bg-paper-2 px-2.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="#hashtags"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              disabled={busy}
              className="btn-action btn-action-primary min-h-9 w-full !text-white text-caption disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {busy ? "Generating…" : "Generate caption + hashtags"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
