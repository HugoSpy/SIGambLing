import { useQuery } from "@tanstack/react-query";
import { claimDailyReward, fetchGamificationState } from "../lib/api";

export function useGamificationState() {
  return useQuery({
    queryKey: ["gamification"],
    queryFn: fetchGamificationState,
  });
}

export { claimDailyReward };
