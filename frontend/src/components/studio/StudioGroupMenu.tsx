import {
  CalendarClock,
  FileText,
  Loader2,
  Megaphone,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import type { StudioTool } from "@/components/studio/StudioCardToolbar";
import { cn } from "@/lib/utils";

/**
 * Multi-select contextual menu — same actions as single-card toolbar (batch).
 */
export function StudioGroupMenu({
  count,
  busy,
  scheduleCount,
  shelfOffset = 0,
  onTool,
  onClear,
}: {
  count: number;
  busy?: StudioTool | "batch" | null;
  scheduleCount: number;
  shelfOffset?: number;
  onTool: (tool: StudioTool) => void;
  onClear: () => void;
}) {
  const items: Array<{
    id: StudioTool;
    label: string;
    icon: typeof FileText;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
  }> = [
    { id: "prepare", label: "AI all", icon: Sparkles, primary: true },
    { id: "transcript", label: "Script", icon: FileText },
    { id: "cta", label: "CTA", icon: Megaphone },
    { id: "caption", label: "Caption", icon: Type },
    {
      id: "schedule",
      label: scheduleCount > 0 ? `Schedule (${scheduleCount})` : "Schedule",
      icon: CalendarClock,
      disabled: scheduleCount === 0,
    },
    { id: "remove", label: "Remove", icon: Trash2, danger: true },
  ];

  return (
    <div
      data-testid="studio-group-menu"
      className={cn(
        "pointer-events-auto absolute top-20 z-40 flex max-w-[min(96vw,44rem)] flex-row flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-line bg-card/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-sm",
        "transition-[transform,opacity] duration-200 ease-out",
      )}
      style={{
        left: "50%",
        transform:
          shelfOffset > 0
            ? `translateX(calc(-50% - ${shelfOffset / 2}px))`
            : "translateX(-50%)",
      }}
    >
      <span className="shrink-0 whitespace-nowrap px-2 text-caption font-semibold text-foreground">
        {count} selected
      </span>
      {items.map((item) => {
        const Icon = item.icon;
        const isBusy = busy === item.id || (busy === "batch" && item.id === "prepare");
        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled || isBusy}
            onClick={() => onTool(item.id)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-caption font-semibold transition-colors duration-150 disabled:opacity-40",
              item.danger
                ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                : item.primary
                  ? "bg-primary text-white hover:bg-[#262626]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {item.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
