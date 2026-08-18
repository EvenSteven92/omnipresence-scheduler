import { useQuery } from "@tanstack/react-query";

export type WorkerHealth = {
  online: boolean;
  detail: string;
  version?: string;
  lastTickAt?: string | null;
};

export function useWorkerHealth() {
  return useQuery({
    queryKey: ["worker-health"],
    queryFn: async (): Promise<WorkerHealth> => {
      try {
        const res = await fetch("/api/ops/health", { credentials: "include" });
        if (!res.ok) {
          return {
            online: false,
            detail: "Worker health endpoint unavailable",
          };
        }
        return (await res.json()) as WorkerHealth;
      } catch {
        return { online: false, detail: "Could not reach local worker" };
      }
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
