import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  PRESETS,
  type Timeframe,
  type TimeframeUnit,
  isAllTime,
  timeframeLabel,
} from "@/lib/timeframe";
import { cn } from "@/lib/utils";

const UNITS: { id: TimeframeUnit; label: string }[] = [
  { id: "day", label: "day(s)" },
  { id: "week", label: "week(s)" },
  { id: "month", label: "month(s)" },
  { id: "year", label: "year(s)" },
];

/**
 * Inline timeframe selector — preset chips + custom (count + unit) + all-time.
 * Paper neobrutalist chrome for Analytics and other surfaces.
 */
export function TimeframeSelector({
  value,
  onChange,
  className = "",
}: {
  value: Timeframe;
  onChange: (next: Timeframe) => void;
  className?: string;
}) {
  const [customCount, setCustomCount] = useState<number>(
    value.kind === "custom" ? value.count : 14,
  );
  const [customUnit, setCustomUnit] = useState<TimeframeUnit>(
    value.kind === "custom" ? value.unit : "week",
  );
  const [unitOpen, setUnitOpen] = useState(false);
  const unitRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (value.kind === "custom") {
      setCustomCount(value.count);
      setCustomUnit(value.unit);
    }
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!unitRef.current?.contains(e.target as Node)) setUnitOpen(false);
    }
    if (unitOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [unitOpen]);

  function commitCustom(count: number, unit: TimeframeUnit) {
    const safe = Math.max(1, Math.min(999, Math.round(count || 1)));
    onChange({ kind: "custom", count: safe, unit });
  }

  const isCustom = value.kind === "custom";
  const isAll = isAllTime(value);

  const chip = (active: boolean) =>
    cn(
      "rounded-md border-[1.5px] border-foreground px-3.5 py-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] transition-colors",
      active
        ? "bg-foreground text-background shadow-[2px_2px_0_0_var(--color-accent)]"
        : "bg-card text-foreground hover:bg-secondary",
    );

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-testid="timeframe-selector"
    >
      {PRESETS.map((p) => {
        const active = value.kind === "preset" && value.preset === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange({ kind: "preset", preset: p.id })}
            data-testid={`tf-preset-${p.id}`}
            className={chip(active)}
          >
            {p.label}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onChange({ kind: "custom", count: customCount, unit: customUnit })}
        data-testid="tf-preset-custom"
        className={chip(isCustom)}
      >
        Custom
      </button>

      <button
        type="button"
        onClick={() => onChange({ kind: "all" })}
        data-testid="tf-preset-all"
        className={chip(isAll)}
      >
        All-time
      </button>

      <div
        className={cn(
          "ml-1 flex items-center gap-2 transition-opacity",
          isCustom ? "opacity-100" : "opacity-40",
        )}
      >
        <input
          type="number"
          min={1}
          max={999}
          value={customCount}
          disabled={!isCustom}
          onChange={(e) => setCustomCount(parseInt(e.target.value, 10) || 1)}
          onBlur={() => isCustom && commitCustom(customCount, customUnit)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          data-testid="tf-custom-count"
          aria-label="custom count"
          className="w-14 rounded-md border-[1.5px] border-foreground bg-paper-2 px-2 py-2 text-center font-data text-[0.7rem] text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
        />
        <div ref={unitRef} className="relative">
          <button
            type="button"
            disabled={!isCustom}
            onClick={() => setUnitOpen((o) => !o)}
            data-testid="tf-custom-unit"
            className="flex items-center gap-1.5 rounded-md border-[1.5px] border-foreground bg-card px-3 py-2 font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed"
          >
            {UNITS.find((u) => u.id === customUnit)?.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {unitOpen && isCustom && (
            <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-md border-[1.5px] border-foreground bg-card shadow-[4px_4px_0_0_var(--color-foreground)]">
              {UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setUnitOpen(false);
                    setCustomUnit(u.id);
                    commitCustom(customCount, u.id);
                  }}
                  data-testid={`tf-unit-${u.id}`}
                  className={cn(
                    "block w-full px-4 py-2.5 text-left font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] transition-colors",
                    customUnit === u.id
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="ml-auto hidden text-body-sm text-muted-foreground lg:block"
        data-testid="timeframe-label"
      >
        Showing <span className="font-medium text-foreground">{timeframeLabel(value)}</span>
      </div>
    </div>
  );
}
