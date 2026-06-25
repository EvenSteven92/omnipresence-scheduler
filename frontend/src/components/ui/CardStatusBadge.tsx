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
        "rounded-[5px] px-2 py-1 font-mono text-[0.5625rem] font-bold uppercase leading-none tracking-[0.06em]",
        cardStatusClass(status),
        className,
      )}
    >
      {status}
    </span>
  );
}