import { useEffect } from "react";
import { useWorkspace } from "@/lib/workspace-context";

/**
 * Applies workspace brand accent without hijacking primary CTAs.
 * TORCC house rule (design system): primary buttons stay black;
 * purple (or workspace accent) is for focus, selection, and rare brand moments.
 *
 * @see docs/TORCC_OMNIPRESENCE_DESIGN_SYSTEM.md
 */
export function BrandTheme() {
  const { workspace } = useWorkspace();
  const brand = workspace.accent || "#812bf5";

  useEffect(() => {
    const root = document.documentElement;
    // Keep product CTAs black regardless of workspace
    root.style.setProperty("--primary", "#0a0a0a");
    root.style.setProperty("--primary-foreground", "#ffffff");
    root.style.setProperty("--accent", "#0a0a0a");
    root.style.setProperty("--accent-foreground", "#ffffff");

    root.style.setProperty("--brand", brand);
    root.style.setProperty(
      "--brand-soft",
      `color-mix(in oklab, ${brand} 12%, transparent)`,
    );
    root.style.setProperty("--ring", brand);
  }, [brand]);

  return null;
}
