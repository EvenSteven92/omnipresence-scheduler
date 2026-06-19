import { useQuery } from "@tanstack/react-query";

export function useTeamSession() {
  return useQuery({
    queryKey: ["team-session"],
    queryFn: async (): Promise<boolean> => {
      const res = await fetch("/api/team/session", { credentials: "include" });
      if (!res.ok) return false;
      const data = (await res.json()) as { authed?: boolean };
      return Boolean(data.authed);
    },
    staleTime: 60_000,
    initialData: () =>
      typeof window !== "undefined" && sessionStorage.getItem("team_authed") === "1",
  });
}
