import { useCallback, useEffect, useState } from "react";
import type { WorkspaceId } from "@/lib/workspaces/types";
import {
  canAutoPublish,
  isClientArmed,
  isClientPublishPaused,
  isGlobalArmed,
  setClientArmed,
  setClientPublishPaused,
  setGlobalArmed,
} from "@/lib/client-ops";
import { syncClientOpsToWorker } from "@/lib/worker-schedule";

const EVT = "omni:client-ops-changed";

function bump() {
  window.dispatchEvent(new Event(EVT));
}

export function useClientOps(clientId: WorkspaceId) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  void tick;

  const globalArmed = isGlobalArmed();
  const armed = isClientArmed(clientId);
  const paused = isClientPublishPaused(clientId);
  const autoPublish = canAutoPublish(clientId);

  useEffect(() => {
    void syncClientOpsToWorker(clientId);
  }, [clientId, tick]);

  const setArmed = useCallback(
    (next: boolean) => {
      setClientArmed(clientId, next);
      void syncClientOpsToWorker(clientId);
      bump();
    },
    [clientId],
  );

  const setPaused = useCallback(
    (next: boolean) => {
      setClientPublishPaused(clientId, next);
      void syncClientOpsToWorker(clientId);
      bump();
    },
    [clientId],
  );

  const setMasterArmed = useCallback(
    (next: boolean) => {
      setGlobalArmed(next);
      void syncClientOpsToWorker(clientId);
      bump();
    },
    [clientId],
  );

  return {
    globalArmed,
    armed,
    paused,
    autoPublish,
    setArmed,
    setPaused,
    setMasterArmed,
  };
}
