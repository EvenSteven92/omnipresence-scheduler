/**
 * Global ⌘K / Ctrl+K command palette — navigate + search cards, boards, events.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { openCardDestination } from "@/lib/card-navigation";
import { listBoards } from "@/lib/studio-boards";
import { enumerateLibraryCards } from "@/lib/studio-library";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

type PaletteItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);

  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const nav: PaletteItem[] = [
      {
        id: "nav-boards",
        group: "Navigate",
        label: "Boards",
        run: () => navigate({ to: "/studio", search: { picker: "1" } }),
      },
      {
        id: "nav-queue",
        group: "Navigate",
        label: "Queue",
        run: () => navigate({ to: "/" }),
      },
      {
        id: "nav-calendar",
        group: "Navigate",
        label: "Calendar",
        run: () => navigate({ to: "/calendar" }),
      },
      {
        id: "nav-events",
        group: "Navigate",
        label: "Events",
        run: () => navigate({ to: "/events" }),
      },
      {
        id: "nav-analytics",
        group: "Navigate",
        label: "Analytics",
        run: () => navigate({ to: "/analytics" }),
      },
    ];

    const boards = listBoards(workspaceId).map(
      (b): PaletteItem => ({
        id: `board-${b.id}`,
        group: "Boards",
        label: b.name,
        hint: "Open board",
        run: () =>
          navigate({
            to: "/studio",
            search: { board: b.id },
          }),
      }),
    );

    const cards = enumerateLibraryCards(
      workspaceId,
      workspace.scheduledPosts,
      workspace.publishedPosts,
    ).map(
      (c): PaletteItem => ({
        id: `card-${c.id}`,
        group: "Cards",
        label: c.title,
        hint: c.boardName,
        run: () => openCardDestination(workspaceId, c.id, navigate),
      }),
    );

    const eventItems = events.map(
      (e): PaletteItem => ({
        id: `event-${e.id}`,
        group: "Events",
        label: e.title,
        hint: e.date.slice(0, 10),
        run: () =>
          navigate({ to: "/events", search: { event: e.id } }),
      }),
    );

    const actions: PaletteItem[] = [
      {
        id: "action-new-board",
        group: "Actions",
        label: "New board",
        run: () =>
          navigate({ to: "/studio", search: { picker: "1", library: "boards" } }),
      },
    ];

    const all = [...nav, ...boards, ...cards, ...eventItems, ...actions];
    if (!q) return all.slice(0, 40);
    return all
      .filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.group.toLowerCase().includes(q) ||
          (i.hint?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 40);
  }, [
    query,
    workspaceId,
    workspace.scheduledPosts,
    workspace.publishedPosts,
    events,
    navigate,
  ]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function runItem(item: PaletteItem) {
    setOpen(false);
    item.run();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 hidden items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-card)] hover:text-foreground md:inline-flex"
        data-testid="command-palette-trigger"
        title="Search (⌘K)"
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd className="rounded border border-line bg-paper-2 px-1.5 py-0.5 font-mono text-[0.6rem]">
          ⌘K
        </kbd>
      </button>
    );
  }

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-foreground/30 p-4 pt-[12vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-testid="command-palette"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-card shadow-[var(--shadow-card)] animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && items[active]) {
                e.preventDefault();
                runItem(items[active]!);
              }
            }}
            placeholder="Search cards, boards, events…"
            className="w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            data-testid="command-palette-input"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 font-mono text-[0.6rem] text-muted-foreground sm:inline">
            esc
          </kbd>
        </div>
        <ul className="max-h-[min(50vh,360px)] overflow-y-auto py-2">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches
            </li>
          ) : (
            items.map((item, i) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <li key={item.id}>
                  {showGroup ? (
                    <p className="px-4 pb-1 pt-2 font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => runItem(item)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm",
                      i === active
                        ? "bg-secondary text-foreground"
                        : "text-foreground hover:bg-paper-2",
                    )}
                  >
                    <span className="truncate font-medium">{item.label}</span>
                    {item.hint ? (
                      <span className="shrink-0 truncate text-xs text-muted-foreground">
                        {item.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
