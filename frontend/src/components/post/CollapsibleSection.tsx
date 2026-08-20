import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
  badge,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="composer-section">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="text-title block">{title}</span>
          {subtitle && (
            <span className="mt-1 block text-[0.65rem] normal-case tracking-normal text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-[var(--motion-panel)] ease-[var(--ease-inout-lux)] ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-[var(--motion-panel)] ease-[var(--ease-inout-lux)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
