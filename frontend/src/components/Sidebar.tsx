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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { SidebarSyncFooter } from "@/components/SidebarSyncFooter";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { computeSidebarNavCounts, type SidebarNavCountKey } from "@/lib/sidebar-nav-counts";
import { countReadyCards } from "@/lib/draft-storage";
import { useWorkspace } from "@/lib/workspace-context";
import { CREATE } from "@/lib/create-actions";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "omni.sidebar.collapsed";

const nav: {
  to: string;
  label: string;
  icon: LucideIcon;
  countKey?: SidebarNavCountKey;
}[] = [
  { to: "/", label: "Queue", icon: LayoutList, countKey: "queue" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, countKey: "calendar" },
  { to: "/events", label: "Events", icon: LayoutGrid, countKey: "events" },
  { to: "/studio", label: "Studio", icon: Clapperboard, countKey: "ready" },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/workspaces", label: "Admin", icon: Settings2 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [readyTick, setReadyTick] = useState(0);
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);

  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  // Re-read ready shelf when workspace changes or window focuses
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
    }),
    [workspace.scheduledPosts, events, readyCount],
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
        style={{ width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)" }}
        className="relative hidden h-full min-h-0 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-line bg-paper-2 px-4 py-5 transition-[width] duration-200 md:flex"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          {!collapsed ? (
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground font-display text-lg font-bold text-background">
                O
              </span>
              <span className="min-w-0 leading-none">
                <span className="block font-display text-base font-bold tracking-tight text-foreground">
                  OmniPresence
                </span>
                <span className="mt-1 block text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  By TORCC
                </span>
              </span>
            </Link>
          ) : (
            <Link
              to="/"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-foreground font-display text-lg font-bold text-background"
              title="OmniPresence"
            >
              O
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>

        <div className="mt-4">
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        {!collapsed ? (
          <p className="mt-5 px-2 text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Workspace
          </p>
        ) : null}

        <nav className="mt-2 flex flex-1 flex-col gap-1" aria-label="Main">
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

        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <Link
            to="/studio"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4 py-3.5 font-display text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#262626] hover:text-white",
              collapsed && "px-2",
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

  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 font-display text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-background hover:text-foreground",
        collapsed && "justify-center px-2",
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
              className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 font-data text-caption font-semibold leading-none tracking-[0.04em] text-foreground group-[.active]:bg-background/15 group-[.active]:text-background"
            >
              {badge}
            </span>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}
