import { CADENCE_PRESETS, type CadencePresetId } from "@/lib/schedule-engine";
import { cn } from "@/lib/utils";

/** One-tap cadence fill — Buffer/Opus style. */
export function ComposerCadenceBar({
  active,
  onSelect,
  disabled,
}: {
  active?: CadencePresetId | null;
  onSelect: (id: CadencePresetId) => void;
  disabled?: boolean;
}) {
  return (
    <div data-testid="composer-cadence-bar" className="space-y-2">
      <p className="text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Cadence
      </p>
      <div className="grid grid-cols-2 gap-2">
        {CADENCE_PRESETS.map((p) => {
          const selected = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(p.id)}
              data-testid={`cadence-${p.id}`}
              className={cn(
                "rounded-md border px-2.5 py-2 text-left transition-colors disabled:opacity-40",
                selected
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-card text-foreground hover:bg-secondary",
              )}
            >
              <span className="block text-body-sm font-semibold">{p.label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-[0.65rem] leading-snug",
                  selected ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {p.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
