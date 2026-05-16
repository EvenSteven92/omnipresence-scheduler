import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home,
  CalendarDays,
  LayoutGrid,
  Sparkles,
  BarChart3,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/scheduler", label: "Scheduler", icon: LayoutGrid },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/ai-studio", label: "AI Studio", icon: Sparkles },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

const STORAGE_KEY = "torcc.sidebar.collapsed";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      data-testid="app-sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      className={`relative flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo / wordmark */}
      <div
        className={`flex items-center border-b border-border/60 ${
          collapsed ? "h-[78px] justify-center px-2" : "h-[78px] px-5"
        }`}
      >
        {collapsed ? (
          <div className="display-mono text-sm text-foreground">T</div>
        ) : (
          <div>
            <div className="display-mono text-base text-foreground">TORCC</div>
            <div className="label-mono mt-1">OmniSocial</div>
          </div>
        )}
      </div>

      {/* Top-anchored stack: nav + actions (≈top third of viewport) */}
      <nav className="flex flex-col gap-1 px-2 pt-3">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            title={collapsed ? label : undefined}
            data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
            className={`group flex items-center rounded-sm text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${
              collapsed ? "h-10 w-full justify-center" : "gap-3 px-3 py-2.5"
            }`}
            activeProps={{
              className: "!bg-secondary !text-foreground border-l-2 border-accent",
            }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
            {!collapsed && <span className="truncate">{label}</span>}
          </Link>
        ))}
      </nav>

      {/* Actions sit right under nav (no flex-1 gap) */}
      <div className={`mt-3 space-y-2 ${collapsed ? "px-2" : "p-3"}`}>
        <Link
          to="/scheduler"
          title={collapsed ? "New Post" : undefined}
          data-testid="sidebar-new-post-btn"
          className={`flex items-center rounded-sm bg-primary text-[0.7rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 ${
            collapsed ? "h-10 w-full justify-center" : "justify-center gap-2 px-3 py-3"
          }`}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          {!collapsed && <span>New Post</span>}
        </Link>
        <button
          type="button"
          title={collapsed ? "Sign out" : undefined}
          data-testid="sidebar-sign-out-btn"
          className={`flex items-center text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground ${
            collapsed ? "h-10 w-full justify-center" : "w-full gap-3 px-3 py-2"
          }`}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* Empty space below — keeps actions anchored near the top third */}
      <div className="flex-1" />

      {/* Floating edge tab (collapse/expand handle) */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand" : "Collapse"}
        data-testid="sidebar-toggle-btn"
        className="group absolute top-1/2 z-30 flex h-12 w-5 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-r-sm border border-l-0 border-border bg-surface text-muted-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground"
        style={{ right: 0 }}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.75} />
        )}
      </button>
    </aside>
  );
}
