import type { AuthUser } from "./auth";

export interface GamificationBadge {
  key: string;
  name: string;
  description: string;
  tone: "cyan" | "orange" | "emerald" | "violet" | "amber" | "sky";
  unlocked_at: string;
}

export interface GamificationProgressItem {
  key: string;
  label: string;
  current: number;
  target: number;
  reward: string;
  completed: boolean;
}

export interface GamificationDailyRewardState {
  day_boundary: "UTC";
  claimed_today: boolean;
  current_streak: number;
  last_claimed_at: string | null;
  next_claim_at: string;
  base_amount: number;
  streak_bonus: number;
  next_amount: number;
  next_streak_bonus: number;
  next_milestone: {
    days: number;
    bonus: number;
  } | null;
}

export interface GamificationState {
  daily_reward: GamificationDailyRewardState;
  badges: GamificationBadge[];
  progress: GamificationProgressItem[];
  stats: {
    event_bets: number;
    event_wins: number;
    casino_games: number;
    casino_wins: number;
    created_markets: number;
    balance: number;
  };
}

export interface ClaimDailyRewardResponse {
  claimed: boolean;
  amount: number;
  base_amount: number;
  streak_bonus: number;
  user: AuthUser;
  gamification: GamificationState;
}
