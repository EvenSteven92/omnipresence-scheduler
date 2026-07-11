import {
  cardStatusClass,
  cardStatusLabel,
  type CardLifecycleStatus,
} from "@/lib/card-display";
import { cn } from "@/lib/utils";

export function CardStatusBadge({
  status,
  className,
}: {
  status: CardLifecycleStatus;
  className?: string;
}) {
  return (
    <span
      data-testid="card-status-badge"
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-caption font-bold uppercase leading-none tracking-[0.06em] transition-colors duration-150",
        cardStatusClass(status),
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current opacity-90",
          status === "IDLE" && "opacity-50",
        )}
        aria-hidden
      />
      {cardStatusLabel(status)}
    </span>
  );
}
