import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-md border border-line bg-paper-2 px-2.5 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20";

export function StudioTitleSection({
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
    <section className="border-t border-line" data-testid="studio-title-section">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Title
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
          <div className="space-y-1.5 px-3 pb-3">
            <p className="text-[0.7rem] text-muted-foreground">
              Required for YouTube Shorts and Rumble — keep it clear and searchable.
            </p>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={fieldClass}
              placeholder="Short title for Shorts / Rumble…"
              maxLength={100}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
