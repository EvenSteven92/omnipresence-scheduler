import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, CalendarDays, Layers, BarChart3, Plus, LogOut, Building2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NewEventSidebarButton } from "@/components/NewEventPostActions";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";

const nav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/events", label: "Events", icon: Layers },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/workspaces", label: "Workspaces", icon: Building2 },
];

/**
 * Permanently narrow sidebar — icons only.
 * Hovering an icon reveals its label as a popout to the right (no width change).
 */
export function Sidebar() {
  // One-time migration: scrub the orphaned localStorage key from any browser
  // that used the older collapsible sidebar. Safe to remove this effect in a
  // future release once the user-base has cycled through at least once.
  useEffect(() => {
    try {
      window.localStorage.removeItem("torcc.sidebar.collapsed");
    } catch {
      /* private mode / quota — ignore */
    }
  }, []);

  return (
    <aside
      data-testid="app-sidebar"
      className="relative flex h-full w-16 shrink-0 flex-col border-r border-border bg-surface"
    >
      <WorkspaceSwitcher />

      {/* Nav stack */}
      <nav className="flex flex-col gap-2 px-2.5 pt-4">
        {nav.map(({ to, label, icon: Icon }) => (
          <SidebarItem key={to} to={to} label={label} Icon={Icon} exact={to === "/"} />
        ))}
      </nav>

      {/* Primary action + sign out */}
      <div className="mt-4 space-y-2.5 px-2.5">
        <SidebarItem
          to="/scheduler"
          label="New Post"
          Icon={Plus}
          variant="primary"
          testid="sidebar-new-post-btn"
        />
        <NewEventSidebarButton />
        <SidebarButton
          label="Sign out"
          Icon={LogOut}
          testid="sidebar-sign-out-btn"
          disabled
          title="Sign in ships with team auth — coming soon"
        />
      </div>

      <div className="flex-1" />

      <div
        className="flex shrink-0 items-center justify-center border-t border-border px-1 py-5"
        aria-hidden="true"
      >
        <span
          data-testid="sidebar-product-name"
          className="label-mono rotate-180 text-[0.45rem] uppercase tracking-[0.28em] text-muted-foreground/55 [writing-mode:vertical-rl]"
        >
          omnipresence
        </span>
      </div>
    </aside>
  );
}

// ─── Items ──────────────────────────────────────────────────────────────────

interface ItemProps {
  label: string;
  Icon: LucideIcon;
}

function HoverLabel({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}

function SidebarItem({
  to,
  label,
  Icon,
  exact,
  variant = "ghost",
  testid,
}: ItemProps & { to: string; exact?: boolean; variant?: "ghost" | "primary"; testid?: string }) {
  const base = "group relative flex h-11 w-full items-center justify-center rounded-sm transition-colors";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "text-muted-foreground hover:bg-secondary hover:text-foreground";

  return (
    <Link
      to={to}
      activeOptions={exact ? { exact: true } : undefined}
      data-testid={testid ?? `nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={`${base} ${styles}`}
      activeProps={
        variant === "ghost"
          ? {
              className:
                "!bg-accent/10 !text-foreground ring-1 ring-inset ring-accent/40 border-l-[3px] border-accent",
            }
          : { className: "!ring-2 !ring-inset !ring-primary-foreground/30" }
      }
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={variant === "primary" ? 2 : 1.5} />
      <HoverLabel label={label} />
    </Link>
  );
}

function SidebarButton({
  label,
  Icon,
  testid,
  disabled = false,
  title,
}: ItemProps & { testid?: string; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-label={label}
      disabled={disabled}
      title={title}
      className={`group relative flex h-11 w-full items-center justify-center rounded-sm text-muted-foreground transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
      <HoverLabel label={label} />
    </button>
  );
}
