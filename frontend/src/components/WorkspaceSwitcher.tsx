import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import type { WorkspaceId } from "@/lib/workspaces";

/**
 * Sidebar workspace picker — switches company context for metrics, posts, and connections.
 */
export function WorkspaceSwitcher() {
  const { workspace, workspaces, setWorkspaceId } = useWorkspace();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative border-b border-border/60 px-2.5 py-3">
      <button
        type="button"
        data-testid="workspace-switcher"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full flex-col items-center gap-1 rounded-sm border border-border bg-background/50 px-1 py-2 transition-colors hover:bg-secondary"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={workspace.name}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-foreground font-mono text-[0.65rem] font-bold text-background">
          {workspace.initials}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select workspace"
          className="absolute left-full top-0 z-50 ml-2 w-64 overflow-hidden rounded-sm border border-border bg-surface shadow-xl"
        >
          <div className="border-b border-border px-3 py-2.5">
            <div className="label-mono">workspace</div>
            <p className="mt-1 text-[0.65rem] leading-relaxed text-muted-foreground">
              Each company has its own platforms, posts, and metrics.
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {workspaces.map((ws) => {
              const active = ws.id === workspace.id;
              return (
                <li key={ws.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-testid={`workspace-option-${ws.slug}`}
                    onClick={() => {
                      setWorkspaceId(ws.id as WorkspaceId);
                      setOpen(false);
                    }}
                    className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                      active ? "bg-secondary" : "hover:bg-secondary/60"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-background font-mono text-[0.6rem] font-semibold text-foreground">
                      {ws.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-foreground">{ws.name}</span>
                      <span className="label-mono mt-0.5 block normal-case tracking-normal text-muted-foreground/80">
                        {ws.tagline}
                      </span>
                      <span
                        className={`label-mono mt-1 inline-block rounded-sm border px-1.5 py-0.5 text-[0.5rem] ${
                          ws.onboardingStatus === "complete"
                            ? "border-success/50 text-success"
                            : ws.onboardingStatus === "needs_accounts"
                              ? "border-warning/50 text-warning"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {ws.onboardingStatus.replace(/_/g, " ")}
                      </span>
                    </span>
                    {active && <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border p-2">
            <Link
              to="/workspaces"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-background/40 px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
            >
              <Plus className="h-3 w-3" />
              Manage / Onboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact label for page headers */
export function WorkspaceEyebrow() {
  const { workspace } = useWorkspace();
  return (
    <span className="inline-flex items-center gap-2">
      <Building2 className="h-3 w-3 text-accent" strokeWidth={1.75} />
      {workspace.slug}
    </span>
  );
}