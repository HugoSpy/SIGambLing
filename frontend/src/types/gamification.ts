import type { AuthUser } from "./auth";

export interface GamificationBadge {
  key: string;
  name: string;
  description: string;
  tone: "cyan" | "orange" | "emerald" | "violet" | "amber" | "sky";
  rarity: "common" | "rare" | "epic";
  icon: string;
  unlocked: boolean;
  unlocked_at: string;
  progress: {
    current: number;
    target: number;
    label: string;
  };
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
  streak_status: "claimed_today" | "claim_available" | "broken";
  last_claimed_at: string | null;
  next_claim_at: string;
  streak_deadline_at: string | null;
  base_amount: number;
  streak_bonus: number;
  next_amount: number;
  next_streak_bonus: number;
  current_tier: {
    key: string;
    label: string;
    minDays: number;
    bonus: number;
    accent: GamificationBadge["tone"];
  };
  next_tier: {
    key: string;
    label: string;
    minDays: number;
    bonus: number;
    accent: GamificationBadge["tone"];
  } | null;
  next_milestone?: {
    days: number;
    bonus: number;
  } | null;
  tier_progress: {
    current: number;
    target: number;
  };
}

export interface JackpotState {
  current_round: {
    id: string;
    label: string;
    current_pot: number;
    seed_amount: number;
    contribution_rate_bps: number;
    ticket_unit_amount: number;
    starts_at: string;
    ends_at: string;
    total_tickets: number;
    user_tickets: number;
    user_entries: number;
    user_contribution: number;
    user_chance_bps: number;
  };
  last_result: {
    round_id: string;
    label: string;
    payout_amount: number;
    resolved_at: string | null;
    winner: {
      id: string;
      pseudo: string;
    } | null;
  } | null;
}

export interface GamificationState {
  daily_reward: GamificationDailyRewardState;
  badges: GamificationBadge[];
  progress: GamificationProgressItem[];
  jackpot: JackpotState;
  stats: {
    event_bets: number;
    event_wins: number;
    casino_games: number;
    casino_wins: number;
    created_markets: number;
    jackpot_entries: number;
    jackpot_tickets: number;
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
