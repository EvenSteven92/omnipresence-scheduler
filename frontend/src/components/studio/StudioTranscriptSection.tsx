import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StudioTranscriptSection({
  open,
  value,
  busy,
  onToggle,
  onChange,
  onGenerate,
}: {
  open: boolean;
  value: string;
  busy?: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  onGenerate: () => void;
}) {
  return (
    <section className="border-t border-line" data-testid="studio-transcript-section">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Transcript
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
          "grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "space-y-2 px-3 pb-3 transition-opacity duration-150",
              open ? "opacity-100" : "opacity-0",
            )}
          >
            <p className="text-[0.7rem] text-muted-foreground">
              Paste notes or generate a draft outline. Real speech-to-text comes later.
            </p>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              rows={6}
              className="w-full resize-y rounded-md border border-line bg-paper-2 px-2.5 py-2 font-mono text-xs leading-relaxed text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              placeholder="[0:00] Hook…"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              disabled={busy}
              className="btn-action btn-action-secondary min-h-9 w-full text-caption disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {busy ? "Generating…" : "Generate transcript draft"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
