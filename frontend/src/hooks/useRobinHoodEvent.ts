import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface RobinHoodVictim {
  userId: string;
  pseudo: string;
  avatarUrl: string | null;
  amountTaken: number;
  amountReturned: number | null;
}

export interface RobinHoodVoteCount {
  userId: string;
  pseudo: string;
  avatarUrl: string | null;
  balance: number;
  voteCount: number;
}

export interface RobinHoodCandidate {
  id: string;
  pseudo: string;
  balance: number;
  rankAtSnapshot: number;
}

export interface RobinHoodEvent {
  id: string;
  status: "VOTE" | "ACTIVE" | "COMPLETED" | "SKIPPED";
  voteStartAt: string;
  voteEndAt: string;
  eventEndAt: string;
  currentPool: number;
  initialPool: number;
  victims: RobinHoodVictim[];
  voteCounts: RobinHoodVoteCount[];
  candidates: RobinHoodCandidate[];
  myVote: string | null;
}

async function fetchCurrentRobinHoodEvent(): Promise<RobinHoodEvent | null> {
  const res = await api.get<RobinHoodEvent | null>("/robin-hood/current");
  return res.data;
}

export function useRobinHoodEvent() {
  return useQuery({
    queryKey: ["robin-hood-current"],
    queryFn: fetchCurrentRobinHoodEvent,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
