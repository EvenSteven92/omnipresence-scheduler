import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function StudioCtaSection({
  open,
  value,
  onToggle,
  onChange,
}: {
  open: boolean;
  value: string;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <section className="border-t border-line" data-testid="studio-cta-section">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Preferred call to action
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-[var(--motion-panel)] ease-[var(--ease-inout-lux)]",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-[var(--motion-panel)] ease-[var(--ease-inout-lux)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "px-3 pb-3 transition-opacity duration-[var(--motion-panel)] ease-[var(--ease-inout-lux)]",
              open ? "opacity-100" : "opacity-0",
            )}
          >
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full rounded-md border border-line bg-paper-2 px-2.5 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
              placeholder="e.g. Join us Sunday · Link in bio · Pray with us"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
