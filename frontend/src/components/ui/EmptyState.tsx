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
        "flex flex-col items-center justify-center rounded-md border-[1.5px] border-foreground bg-card px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border-[1.5px] border-foreground bg-secondary">
          <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
        </div>
      ) : null}
      <p className="text-body font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 max-w-md text-body-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
