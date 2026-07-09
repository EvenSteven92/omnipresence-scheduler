import { useQuery } from "@tanstack/react-query";

/** Team access code is disabled — always authed. */
export function useTeamSession() {
  return useQuery({
    queryKey: ["team-session"],
    queryFn: async (): Promise<boolean> => true,
    staleTime: Infinity,
    initialData: true,
  });
}
