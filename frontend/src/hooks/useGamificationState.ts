import { useQuery } from "@tanstack/react-query";
import { claimDailyReward, fetchGamificationState, fetchJackpotState } from "../lib/api";

export function useGamificationState() {
  return useQuery({
    queryKey: ["gamification"],
    queryFn: fetchGamificationState,
    refetchInterval: 30_000,
  });
}

export function useJackpotState() {
  return useQuery({
    queryKey: ["jackpot"],
    queryFn: fetchJackpotState,
    refetchInterval: 30_000,
  });
}

export { claimDailyReward };
