import { cn } from "@/lib/utils";

export function CardPublishChip({
  label,
  dotColor,
  className,
}: {
  label: string;
  dotColor: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] border border-foreground px-1.5 py-1 font-mono text-[0.625rem] font-semibold leading-none text-foreground",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      {label}
    </span>
  );
}
