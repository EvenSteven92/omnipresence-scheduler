import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRESETS, type Timeframe, type TimeframeUnit, isAllTime, timeframeLabel } from "@/lib/timeframe";

const UNITS: { id: TimeframeUnit; label: string }[] = [
  { id: "day", label: "day(s)" },
  { id: "week", label: "week(s)" },
  { id: "month", label: "month(s)" },
  { id: "year", label: "year(s)" },
];

/**
 * Inline timeframe selector — preset chips + custom (count + unit) + all-time.
 * Reused by Dashboard and Analytics.
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
  // Local "draft" custom value — only commits to parent on blur/Enter, so typing
  // doesn't spam re-renders downstream.
  const [customCount, setCustomCount] = useState<number>(
    value.kind === "custom" ? value.count : 14,
  );
  const [customUnit, setCustomUnit] = useState<TimeframeUnit>(
    value.kind === "custom" ? value.unit : "week",
  );
  const [unitOpen, setUnitOpen] = useState(false);
  const unitRef = useRef<HTMLDivElement | null>(null);

  // Sync local draft when parent value changes externally
  useEffect(() => {
    if (value.kind === "custom") {
      setCustomCount(value.count);
      setCustomUnit(value.unit);
    }
  }, [value]);

  // Close unit dropdown on outside click
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

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`} data-testid="timeframe-selector">
      {PRESETS.map((p) => {
        const active = value.kind === "preset" && value.preset === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange({ kind: "preset", preset: p.id })}
            data-testid={`tf-preset-${p.id}`}
            className={`rounded-sm border border-border px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
              active
                ? "bg-foreground text-background"
                : "bg-surface text-foreground hover:bg-secondary"
            }`}
          >
            {p.label}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => onChange({ kind: "custom", count: customCount, unit: customUnit })}
        data-testid="tf-preset-custom"
        className={`rounded-sm border border-border px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
          isCustom
            ? "bg-foreground text-background"
            : "bg-surface text-foreground hover:bg-secondary"
        }`}
      >
        Custom
      </button>

      <button
        type="button"
        onClick={() => onChange({ kind: "all" })}
        data-testid="tf-preset-all"
        className={`rounded-sm border border-border px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
          isAll ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-secondary"
        }`}
      >
        All-time
      </button>

      {/* Custom count + unit (only enabled when Custom is active) */}
      <div
        className={`ml-1 flex items-center gap-2 transition-opacity ${
          isCustom ? "opacity-100" : "opacity-40"
        }`}
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
          className="w-14 rounded-sm border border-border bg-surface px-2.5 py-2 text-center font-mono text-[0.65rem] text-foreground focus:border-accent focus:outline-none disabled:cursor-not-allowed"
        />
        <div ref={unitRef} className="relative">
          <button
            type="button"
            disabled={!isCustom}
            onClick={() => setUnitOpen((o) => !o)}
            data-testid="tf-custom-unit"
            className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed"
          >
            {UNITS.find((u) => u.id === customUnit)?.label}
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
          {unitOpen && isCustom && (
            <div className="absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-sm border border-border bg-surface shadow-lg">
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
                  className={`block w-full px-4 py-2.5 text-left text-[0.65rem] uppercase tracking-[0.14em] transition-colors ${
                    customUnit === u.id
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="label-mono ml-2 hidden lg:block" data-testid="timeframe-label">
        showing · {timeframeLabel(value)}
      </div>
    </div>
  );
}
