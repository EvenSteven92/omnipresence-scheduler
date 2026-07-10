import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-line bg-card px-6 py-12 text-center shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-paper-2">
          <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
        </div>
      ) : null}
      <p className="font-serif-accent text-2xl text-foreground md:text-[1.75rem]">{title}</p>
      {description ? (
        <p className="mt-3 max-w-md text-body-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
