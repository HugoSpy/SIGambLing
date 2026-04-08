import type { AuthUser } from "./auth";

export type BadgeCatalogRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type BadgeVisibility = "PUBLIC" | "SECRET";

export interface GamificationBadge {
  key: string;
  name: string;
  description: string;
  tone: "emerald" | "sky" | "violet" | "amber";
  rarity: "common" | "rare" | "epic" | "legendary";
  catalog_rarity: BadgeCatalogRarity;
  visibility: BadgeVisibility;
  reward: number;
  unlocked: boolean;
  unlocked_at: string | null;
  claimed_at: string | null;
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
    minScore: number;
    bonus: number;
    accent: GamificationBadge["tone"];
  };
  next_tier: {
    key: string;
    label: string;
    minScore: number;
    bonus: number;
    accent: GamificationBadge["tone"];
  } | null;
  rank_score: number;
  wager_7d: number;
  wager_coef: number;
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
  current_pot: number;
  contribution_rate_bps: number;
  total_contributed: number;
  user_contribution_total: number;
  user_contribution_count: number;
  updated_at: string;
  last_result: {
    payout_amount: number;
    won_at: string | null;
    winner: {
      id: string;
      pseudo: string;
    } | null;
  } | null;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    pseudo: string;
    avatar_url: string | null;
  };
  total_wagered: number;
  casino_wagered: number;
  event_wagered: number;
  recent_activity_at: string | null;
  is_current_user: boolean;
}

export interface LeaderboardView {
  scope: "global" | "casino";
  window_days: number;
  limit: number;
  total_ranked_users: number;
  entries: LeaderboardEntry[];
  current_user_entry: LeaderboardEntry | null;
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
