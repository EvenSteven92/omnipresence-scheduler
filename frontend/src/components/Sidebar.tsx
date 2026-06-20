import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home,
  CalendarDays,
  Layers,
  BarChart3,
  Building2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CreateMenu } from "@/components/CreateMenu";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "omni.sidebar.collapsed";

const nav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/events", label: "Events", icon: Layers },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/workspaces", label: "Workspaces", icon: Building2 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setCollapsed(true);
      window.localStorage.removeItem("torcc.sidebar.collapsed");
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
      {/* Desktop sidebar */}
      <aside
        data-testid="app-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
        style={{ width: collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width)" }}
        className="relative hidden h-full shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          {!collapsed ? (
            <Link to="/" className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">OmniSocial</span>
              <span className="text-eyebrow normal-case tracking-normal">by TORCC</span>
            </Link>
          ) : (
            <Link
              to="/"
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-sm bg-primary font-data text-xs font-bold text-primary-foreground"
              title="OmniSocial"
            >
              OS
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>

        <WorkspaceSwitcher collapsed={collapsed} />

        <nav className="flex flex-1 flex-col gap-1 px-2 py-3" aria-label="Main">
          {nav.map(({ to, label, icon: Icon }) => (
            <SidebarItem
              key={to}
              to={to}
              label={label}
              Icon={Icon}
              collapsed={collapsed}
              exact={to === "/"}
            />
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-2">
          <CreateMenu collapsed={collapsed} className={collapsed ? "px-0" : undefined} />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        data-testid="mobile-nav"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-surface px-2 py-2 md:hidden"
        aria-label="Mobile"
      >
        {nav.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={to === "/" ? { exact: true } : undefined}
            className="flex flex-col items-center gap-0.5 rounded-sm px-2 py-1 text-[0.65rem] text-muted-foreground"
            activeProps={{ className: "!text-accent" }}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <span>{label}</span>
          </Link>
        ))}
        <Link
          to="/scheduler"
          className="flex flex-col items-center gap-0.5 rounded-sm bg-primary px-3 py-1.5 text-[0.65rem] font-medium text-primary-foreground"
        >
          <span className="text-lg leading-none">+</span>
          <span>Create</span>
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
}: {
  to: string;
  label: string;
  Icon: LucideIcon;
  collapsed: boolean;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-sm px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-secondary hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "justify-center px-2",
      )}
      activeProps={{
        className: cn(
          "!bg-accent/10 !text-foreground",
          !collapsed && "border-l-[3px] border-accent pl-[calc(0.625rem-3px)]",
        ),
      }}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}
