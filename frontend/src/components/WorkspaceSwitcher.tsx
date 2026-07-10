import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Check, ChevronDown, Plus } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import type { WorkspaceId } from "@/lib/workspaces";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        data-testid="workspace-switcher"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-line bg-card text-left transition-colors hover:bg-paper-2/60",
          collapsed ? "justify-center px-2 py-2" : "px-2.5 py-2.5",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={workspace.name}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground font-data text-[0.65rem] font-bold text-background">
          {workspace.initials}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium text-foreground">
                {workspace.name}
              </span>
              <span className="block truncate text-body-sm text-muted-foreground">
                {workspace.tagline}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              strokeWidth={2}
            />
          </>
        ) : null}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select workspace"
          className={cn(
            "absolute z-50 overflow-hidden rounded-lg border border-line bg-card shadow-[var(--shadow-card)]",
            collapsed ? "left-full top-0 ml-2 w-64" : "left-2 right-2 top-full mt-1",
          )}
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="text-sm font-semibold text-foreground">Workspaces</p>
            <p className="mt-0.5 text-body-sm text-muted-foreground">
              Each company has its own platforms and content.
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
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
                      active ? "bg-brand-soft" : "hover:bg-secondary/60",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-paper-2 font-data text-[0.7rem] font-semibold">
                      {ws.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{ws.name}</span>
                      <span className="mt-0.5 block text-body-sm text-muted-foreground">
                        {ws.tagline}
                      </span>
                      <Badge
                        tone={
                          ws.onboardingStatus === "complete"
                            ? "success"
                            : ws.onboardingStatus === "needs_accounts"
                              ? "warning"
                              : "muted"
                        }
                        className="mt-1.5"
                      >
                        {ws.onboardingStatus === "complete"
                          ? "Connected"
                          : ws.onboardingStatus === "needs_accounts"
                            ? "Needs accounts"
                            : "Draft"}
                      </Badge>
                    </span>
                    {active ? <Check className="mt-1 h-4 w-4 shrink-0 text-accent" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line p-2">
            <Link
              to="/workspaces"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <Plus className="h-3.5 w-3.5" />
              Manage workspaces
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkspaceEyebrow() {
  const { workspace } = useWorkspace();
  return (
    <span className="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
      <Building2 className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
      {workspace.name}
    </span>
  );
}
