import { useEffect } from "react";
import { useWorkspace } from "@/lib/workspace-context";

/**
 * Tints the UI to the active brand by overriding the accent CSS variables on
 * the document root. The light base palette stays; only the accent changes
 * when you switch workspaces (TORCC / Open Eyes / KEKA / First Love).
 */
export function BrandTheme() {
  const { workspace } = useWorkspace();
  const accent = workspace.accent;
  const accentForeground = workspace.accentForeground ?? "oklch(0.99 0 0)";

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--primary", accent);
    root.style.setProperty("--ring", accent);
    root.style.setProperty("--accent-foreground", accentForeground);
    root.style.setProperty("--primary-foreground", accentForeground);
  }, [accent, accentForeground]);

  return null;
}
