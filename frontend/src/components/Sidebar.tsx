import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutList,
  CalendarDays,
  LayoutGrid,
  BarChart3,
  Settings2,
  PanelLeftClose,
  PanelLeft,
  Clapperboard,
  Search,
  LayoutDashboard,
  Inbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { SidebarSyncFooter } from "@/components/SidebarSyncFooter";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { computeSidebarNavCounts, type SidebarNavCountKey } from "@/lib/sidebar-nav-counts";
import { countReadyCards } from "@/lib/draft-storage";
import { useWorkspace } from "@/lib/workspace-context";
import { useEngageUnread } from "@/hooks/useEngage";
import { CREATE } from "@/lib/create-actions";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "omni.sidebar.collapsed";

const nav: {
  to: string;
  label: string;
  icon: LucideIcon;
  countKey?: SidebarNavCountKey;
}[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/engage", label: "Engage", icon: Inbox, countKey: "engage" },
  { to: "/studio", label: "Boards", icon: Clapperboard, countKey: "ready" },
  { to: "/queue", label: "Queue", icon: LayoutList, countKey: "queue" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, countKey: "calendar" },
  { to: "/events", label: "Events", icon: LayoutGrid, countKey: "events" },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/clients", label: "Clients", icon: Settings2 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [readyTick, setReadyTick] = useState(0);
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const { data: engageUnread } = useEngageUnread(workspaceId);

  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  useEffect(() => {
    const bump = () => setReadyTick((n) => n + 1);
    window.addEventListener("focus", bump);
    const id = window.setInterval(bump, 2000);
    return () => {
      window.removeEventListener("focus", bump);
      window.clearInterval(id);
    };
  }, []);

  const readyCount = useMemo(() => {
    void readyTick;
    return countReadyCards(workspaceId);
  }, [workspaceId, readyTick]);

  const navCounts = useMemo(
    () => ({
      ...computeSidebarNavCounts(workspace.scheduledPosts, events),
      ready: readyCount,
      engage: engageUnread?.unread ?? 0,
    }),
    [workspace.scheduledPosts, events, readyCount, engageUnread?.unread],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <>
      <aside
        data-testid="app-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
        style={{
          width: collapsed
            ? "var(--sidebar-width-collapsed)"
            : "var(--sidebar-width)",
        }}
        className={cn(
          "relative hidden h-full min-h-0 shrink-0 flex-col overscroll-contain border-r border-line bg-paper-2 py-4 transition-[width] duration-[var(--motion-sidebar)] ease-[var(--ease-inout-lux)] md:flex",
          /* Icon rail: never bleed labels during width animation */
          "overflow-x-hidden overflow-y-auto",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {/* Header: expanded = logo row; collapsed = stacked icon rail */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              to="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground font-display text-lg font-bold text-background"
              title="OmniPresence"
            >
              O
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1 px-0.5">
            <Link to="/" className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground font-display text-lg font-bold text-background">
                O
              </span>
              <span className="min-w-0 leading-none">
                <span className="block truncate font-display text-base font-bold tracking-tight text-foreground">
                  OmniPresence
                </span>
                <span className="mt-1 block truncate text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  By TORCC
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        )}

        <div className={cn("mt-3", collapsed && "flex justify-center")}>
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        {/* Cmd+K affordance in nav rail */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new Event("omni:open-command-palette"));
          }}
          className={cn(
            "mt-3 flex items-center gap-2 rounded-md border border-line bg-card text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground",
            collapsed ? "mx-auto h-9 w-9 justify-center p-0" : "w-full px-2.5 py-2",
          )}
          title="Search (⌘K)"
          data-testid="sidebar-search"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {!collapsed ? (
            <>
              <span className="flex-1 text-left text-xs font-semibold">
                Search
              </span>
              <kbd className="rounded border border-line bg-paper-2 px-1 py-0.5 font-mono text-[0.55rem]">
                ⌘K
              </kbd>
            </>
          ) : null}
        </button>

        {!collapsed ? (
          <p className="mt-5 px-2 text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Navigate
          </p>
        ) : (
          <div className="mt-3" aria-hidden />
        )}

        <nav
          className={cn(
            "mt-2 flex min-h-0 flex-1 flex-col gap-1",
            collapsed && "items-stretch",
          )}
          aria-label="Main"
        >
          {nav.map(({ to, label, icon: Icon, countKey }) => (
            <SidebarItem
              key={to}
              to={to}
              label={label}
              Icon={Icon}
              collapsed={collapsed}
              exact={to === "/"}
              badge={countKey ? navCounts[countKey] : undefined}
            />
          ))}
        </nav>

        <div
          className={cn(
            "mt-auto space-y-3 border-t border-line pt-3",
            collapsed && "flex flex-col items-center",
          )}
        >
          <Link
            to="/studio"
            title={CREATE.card}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary font-display text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#262626] hover:text-white",
              collapsed ? "h-10 w-10 p-0" : "w-full px-4 py-3.5",
            )}
          >
            <span className="text-lg leading-none text-white">+</span>
            {!collapsed ? <span className="text-white">{CREATE.card}</span> : null}
          </Link>
          <SidebarSyncFooter collapsed={collapsed} />
        </div>
      </aside>

      <nav
        data-testid="mobile-nav"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-background px-2 py-2 md:hidden"
        aria-label="Mobile"
      >
        {nav.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={to === "/" ? { exact: true } : undefined}
            className="flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[0.65rem] text-muted-foreground"
            activeProps={{ className: "!text-foreground !font-semibold" }}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span>{label}</span>
          </Link>
        ))}
        <Link
          to="/studio"
          className="flex flex-col items-center gap-0.5 rounded-lg border border-line bg-primary px-3 py-1.5 font-display text-[0.65rem] font-medium text-white"
        >
          <span className="text-lg leading-none text-white">+</span>
          <span className="text-white">{CREATE.card}</span>
        </Link>
      </nav>
    </>
  );
}

function SidebarItem({
  to,
  label,
  Icon,
  collapsed,
  exact,
  badge,
}: {
  to: string;
  label: string;
  Icon: LucideIcon;
  collapsed: boolean;
  exact?: boolean;
  badge?: number;
}) {
  const showBadge = badge !== undefined && badge > 0;
  const title =
    collapsed && showBadge ? `${label} (${badge})` : collapsed ? label : undefined;

  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
      title={title}
      className={cn(
        "group relative flex items-center rounded-lg border border-transparent font-display text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-background hover:text-foreground",
        collapsed
          ? "h-10 w-full justify-center px-0"
          : "gap-3 px-3 py-2.5",
      )}
      activeProps={{
        className: cn(
          "!border-brand/30 !bg-brand-soft !text-foreground !font-semibold",
        ),
      }}
    >
      <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.8} />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {showBadge ? (
            <span
              data-testid={`nav-badge-${label.toLowerCase()}`}
              className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 font-data text-caption font-semibold leading-none tracking-[0.04em] text-foreground"
            >
              {badge}
            </span>
          ) : null}
        </>
      ) : showBadge ? (
        <span
          data-testid={`nav-badge-${label.toLowerCase()}`}
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}
