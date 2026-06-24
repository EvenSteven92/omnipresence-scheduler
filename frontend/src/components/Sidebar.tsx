import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutList,
  CalendarDays,
  LayoutGrid,
  BarChart3,
  Settings2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "omni.sidebar.collapsed";

const nav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Queue", icon: LayoutList },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/events", label: "Albums", icon: LayoutGrid },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/workspaces", label: "Admin", icon: Settings2 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

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
        className="relative hidden h-full shrink-0 flex-col border-r-[1.5px] border-foreground bg-background px-4 py-5 transition-[width] duration-200 md:flex"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          {!collapsed ? (
            <Link to="/" className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border-[1.5px] border-foreground bg-accent font-display text-lg font-extrabold text-foreground">
                O
              </span>
              <span className="min-w-0 leading-none">
                <span className="block font-display text-base font-bold text-foreground">OmniSocial</span>
                <span className="mt-1 block font-mono text-[0.5625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  By TORCC
                </span>
              </span>
            </Link>
          ) : (
            <Link
              to="/"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border-[1.5px] border-foreground bg-accent font-display text-lg font-extrabold text-foreground"
              title="OmniSocial"
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
          <p className="mt-5 px-2 font-mono text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Workspace
          </p>
        ) : null}

        <nav className="mt-2 flex flex-1 flex-col gap-1" aria-label="Main">
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

        <div className="mt-auto space-y-3 border-t-[1.5px] border-foreground/15 pt-4">
          <Link
            to="/scheduler"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border-[1.5px] border-foreground bg-accent px-4 py-3.5 font-display text-sm font-bold text-foreground shadow-[3px_3px_0_0_var(--color-foreground)] transition-[transform,box-shadow] duration-150 hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--color-foreground)]",
              collapsed && "px-2",
            )}
          >
            <span className="text-lg leading-none">+</span>
            {!collapsed ? <span>New card</span> : null}
          </Link>
        </div>
      </aside>

      <nav
        data-testid="mobile-nav"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t-[1.5px] border-foreground bg-background px-2 py-2 md:hidden"
        aria-label="Mobile"
      >
        {nav.slice(0, 4).map(({ to, label, icon: Icon }) => (
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
          to="/scheduler"
          className="flex flex-col items-center gap-0.5 rounded-md border-[1.5px] border-foreground bg-accent px-3 py-1.5 font-display text-[0.65rem] font-bold text-foreground"
        >
          <span className="text-lg leading-none">+</span>
          <span>New card</span>
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
        "group flex items-center gap-3 rounded-md border-[1.5px] border-transparent px-3 py-2.5 font-display text-sm font-semibold text-foreground transition-colors",
        "hover:bg-paper-2/60",
        collapsed && "justify-center px-2",
      )}
      activeProps={{
        className: cn(
          "!border-foreground !bg-foreground !text-background",
        ),
      }}
    >
      <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.8} />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}