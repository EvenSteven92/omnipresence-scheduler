import {
  cardStatusLabel,
  trafficDotClass,
  type CardLifecycleStatus,
} from "@/lib/card-display";
import { cn } from "@/lib/utils";

/**
 * Site-wide traffic light cue:
 * grey idle · yellow scheduled · green live · red failed
 */
export function TrafficLight({
  status,
  size = "md",
  showLabel = false,
  className,
  title,
}: {
  status: CardLifecycleStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
  title?: string;
}) {
  const dim =
    size === "sm" ? "h-2 w-2" : size === "lg" ? "h-3 w-3" : "h-2.5 w-2.5";
  const label = cardStatusLabel(status);

  return (
    <span
      data-testid="traffic-light"
      data-status={status}
      title={title ?? label}
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors duration-150",
        className,
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-full transition-colors duration-150",
          dim,
          trafficDotClass(status),
        )}
        aria-hidden
      />
      {showLabel ? (
        <span
          className={cn(
            "font-mono text-[0.6rem] font-bold uppercase tracking-[0.06em]",
            status === "SCHEDULED" && "text-warning",
            status === "LIVE" && "text-success",
            status === "FAILED" && "text-destructive",
            status === "IDLE" && "text-muted-foreground",
          )}
        >
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
