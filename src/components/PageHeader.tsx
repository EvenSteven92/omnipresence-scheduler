import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between border-b border-border px-10 pt-10 pb-6">
      <div>
        {eyebrow && <div className="label-mono mb-2">{eyebrow}</div>}
        <h1 className="display-mono text-3xl tracking-[0.08em] text-foreground">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
