import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  className,
  children,
  elevated = false,
}: {
  className?: string;
  children: ReactNode;
  elevated?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border-[1.5px] border-foreground bg-card",
        elevated && "shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b-[1.5px] border-foreground px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-title text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
