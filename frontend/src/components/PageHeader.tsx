import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header flex items-end justify-between gap-6 border-b border-border">
      <div className="min-w-0">
        {eyebrow != null && eyebrow !== "" && (
          <div className="label-mono mb-3">{eyebrow}</div>
        )}
        <h1 className="display-mono text-3xl tracking-[0.08em] text-foreground">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">{actions}</div>}
    </div>
  );
}
