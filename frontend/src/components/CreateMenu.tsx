import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CalendarPlus, ChevronDown, FilePlus } from "lucide-react";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { CREATE } from "@/lib/create-actions";
import { cn } from "@/lib/utils";

export function CreateMenu({
  className,
  collapsed = false,
  testId = "create-menu",
}: {
  className?: string;
  collapsed?: boolean;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { openCreateEvent, modal } = useCreateEventFlow();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <>
      <div ref={rootRef} className={cn("relative", className)}>
        <button
          type="button"
          data-testid={testId}
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Create"
          className={cn(
            "btn-action btn-action-primary w-full !text-white",
            collapsed ? "justify-center px-2" : "justify-between",
          )}
        >
          <span className="flex items-center gap-2 text-white">
            <FilePlus className="h-4 w-4 text-white" strokeWidth={2} />
            {!collapsed ? "Create" : null}
          </span>
          {!collapsed ? (
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          ) : null}
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute bottom-full left-0 z-50 mb-2 w-full min-w-[12rem] overflow-hidden rounded-sm border border-foreground bg-popover shadow-xl"
          >
            <Link
              to="/scheduler"
              role="menuitem"
              onClick={() => setOpen(false)}
              data-testid="create-new-post"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary"
            >
              <FilePlus className="h-4 w-4 text-accent" strokeWidth={1.75} />
              {CREATE.card}
            </Link>
            <button
              type="button"
              role="menuitem"
              data-testid="create-new-event"
              onClick={() => {
                setOpen(false);
                openCreateEvent();
              }}
              className="flex w-full items-center gap-2.5 border-t border-foreground px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
            >
              <CalendarPlus className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              {CREATE.event}
            </button>
          </div>
        ) : null}
      </div>
      {modal}
    </>
  );
}
