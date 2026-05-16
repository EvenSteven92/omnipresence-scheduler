import { Link } from "@tanstack/react-router";
import { Home, CalendarDays, LayoutGrid, Sparkles, BarChart3, Plus, LogOut } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/scheduler", label: "Scheduler", icon: LayoutGrid },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/ai-studio", label: "AI Studio", icon: Sparkles },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-5 pt-6 pb-8">
        <div className="display-mono text-base text-foreground">TORCC</div>
        <div className="label-mono mt-1">OmniSocial</div>
      </div>

      <nav className="flex-1 px-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="group mb-1 flex items-center gap-3 rounded-sm px-3 py-2.5 text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{
              className: "!bg-secondary !text-foreground border-l-2 border-accent",
            }}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="space-y-2 p-3">
        <Link
          to="/scheduler"
          className="flex items-center justify-center gap-2 rounded-sm bg-primary px-3 py-3 text-[0.7rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          New Post
        </Link>
        <button className="flex w-full items-center gap-3 px-3 py-2 text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
