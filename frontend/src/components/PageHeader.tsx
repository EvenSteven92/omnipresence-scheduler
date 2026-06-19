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
    <div className="page-header flex flex-wrap items-end justify-between gap-4 border-b border-border">
      <div className="min-w-0">
        {eyebrow != null && eyebrow !== "" && <div className="mb-2">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
