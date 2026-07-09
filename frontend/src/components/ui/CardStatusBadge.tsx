import { cardStatusClass, type CardLifecycleStatus } from "@/lib/card-display";
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
      className={cn(
        "rounded-md px-2 py-1 font-mono text-caption font-bold uppercase leading-none tracking-[0.06em]",
        cardStatusClass(status),
        className,
      )}
    >
      {status}
    </span>
  );
}
