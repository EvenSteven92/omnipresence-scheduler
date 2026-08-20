import type { WorkspaceId } from "@/lib/workspaces/types";

/**
 * Personal ops prefs per client — local until the Mac worker owns them.
 * Armed auto-post = schedule fires without approval when the worker is running.
 */

const ARMED_KEY = "omni.ops.armed.";
const PAUSED_KEY = "omni.ops.publishPaused.";
const GLOBAL_ARMED_KEY = "omni.ops.globalArmed";

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === "1" || raw === "true";
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Global master: when false, no client publishes (UI + future worker). Default armed. */
export function isGlobalArmed(): boolean {
  return readBool(GLOBAL_ARMED_KEY, true);
}

export function setGlobalArmed(armed: boolean): void {
  writeBool(GLOBAL_ARMED_KEY, armed);
}

/** Per-client: schedule is armed for auto-post (default true). */
export function isClientArmed(clientId: WorkspaceId): boolean {
  return readBool(ARMED_KEY + clientId, true);
}

export function setClientArmed(clientId: WorkspaceId, armed: boolean): void {
  writeBool(ARMED_KEY + clientId, armed);
}

/** Kill switch: pause all publishing for this client. */
export function isClientPublishPaused(clientId: WorkspaceId): boolean {
  return readBool(PAUSED_KEY + clientId, false);
}

export function setClientPublishPaused(clientId: WorkspaceId, paused: boolean): void {
  writeBool(PAUSED_KEY + clientId, paused);
}

/** True when the worker should actually fire posts for this client. */
export function canAutoPublish(clientId: WorkspaceId): boolean {
  return isGlobalArmed() && isClientArmed(clientId) && !isClientPublishPaused(clientId);
}

export type AttentionItem = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  href?: string;
};

/** Placeholder attention rules until live inbox/publish exist. */
export function buildAttentionItems(input: {
  clientId: WorkspaceId;
  clientName: string;
  scheduledCount: number;
  failedCount: number;
  connected: boolean;
  workerOnline: boolean;
  unreadComments?: number;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (!input.workerOnline) {
    items.push({
      id: "worker-offline",
      severity: "warning",
      title: "Local worker not running",
      detail:
        "Armed auto-post and inbox sync need the Mac worker. Open OmniPresence or start the worker Launch Agent.",
      href: "/clients",
    });
  }
  if (!input.connected) {
    items.push({
      id: `connect-${input.clientId}`,
      severity: "warning",
      title: `Connect channels for ${input.clientName}`,
      detail: "YouTube / Meta unlock live metrics, comments, and publishing.",
      href: "/clients",
    });
  }
  if ((input.unreadComments ?? 0) > 0) {
    items.push({
      id: `unread-${input.clientId}`,
      severity: "warning",
      title: `${input.unreadComments} unread comment${input.unreadComments === 1 ? "" : "s"}`,
      detail: "Open Engage to reply from OmniPresence.",
      href: "/engage",
    });
  }
  if (input.failedCount > 0) {
    items.push({
      id: `failed-${input.clientId}`,
      severity: "critical",
      title: `${input.failedCount} failed publish${input.failedCount === 1 ? "" : "es"}`,
      detail: "Open Queue to retry or fix media / permissions.",
      href: "/queue",
    });
  }
  if (!canAutoPublish(input.clientId) && input.scheduledCount > 0) {
    items.push({
      id: `paused-${input.clientId}`,
      severity: "info",
      title: "Auto-post paused for this client",
      detail: `${input.scheduledCount} scheduled item${input.scheduledCount === 1 ? "" : "s"} will not fire until you re-arm.`,
      href: "/clients",
    });
  }
  return items;
}
