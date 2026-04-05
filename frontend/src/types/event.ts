export type EventStatus = "OPEN" | "CLOSED" | "RESOLVED" | "CANCELLED";
export type EventType = "BINARY" | "MULTIPLE_CHOICE";
export type EventBetStatus = "PENDING" | "WON" | "LOST" | "CANCELLED";
export type EventBetType = "SIMPLE" | "PARLAY";
export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface EventOptionView {
  label: string;
  pool: number;
  percentage: number;
  odds: number;
  initial_odds: number;
  current_odds: number;
  is_winning: boolean | null;
}

export interface EventUserSummary {
  id: string;
  pseudo: string;
}

export interface EventSearchUser {
  id: string;
  pseudo: string;
  email: string;
  avatar_url: string | null;
}

export interface AdminUserLookup extends EventSearchUser {
  balance: number;
  role: "user" | "validator" | "admin";
  streak_days: number;
  last_reward_at: string | null;
  created_at: string;
  badges: string[];
}

export interface AdminBadgeCatalogItem {
  key: string;
  name: string;
  description: string;
  tone: "cyan" | "orange" | "emerald" | "violet" | "amber" | "sky";
}

export interface EventLegView {
  id: string;
  event_id: string;
  chosen_option: string;
  odds_at_bet: number;
  status: EventBetStatus;
  event: {
    id: string;
    title: string;
    status: EventStatus;
    resolved_option: string | null;
    closing_at: string | null;
    image_url: string | null;
  };
}

export interface EventBetView {
  id: string;
  user_id: string;
  event_id: string | null;
  event: {
    id: string;
    title: string;
    status: EventStatus;
    resolved_option: string | null;
    closing_at: string | null;
    image_url: string | null;
  } | null;
  chosen_option: string | null;
  type: EventBetType;
  status: EventBetStatus;
  stake: number;
  total_odds: number;
  odds_at_bet: number | null;
  potential_payout: number;
  actual_payout: number | null;
  placed_at: string;
  resolved_at: string | null;
  legs: EventLegView[];
}

export interface EventView {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  image_url: string | null;
  options: EventOptionView[];
  total_pool: number;
  status: EventStatus;
  resolved_option: string | null;
  closing_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  min_bet: number;
  max_bet: number | null;
  is_excluded: boolean;
  can_bet: boolean;
  my_bets: EventBetView[];
  my_bet_count: number;
  created_by: EventUserSummary | null;
}

export interface AdminEventView {
  id: string;
  title: string;
  description: string | null;
  type: EventType;
  image_url: string | null;
  options: EventOptionView[];
  total_pool: number;
  status: EventStatus;
  resolved_option: string | null;
  closing_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  min_bet: number;
  max_bet: number | null;
  house_margin: number;
  created_by: EventUserSummary | null;
  excluded_users: EventSearchUser[];
  bet_count: number;
}

export interface EventOddsHistoryPoint {
  odds: number;
  total_staked: number;
  timestamp: string;
}

export interface EventOddsHistorySeries {
  option: string;
  points: EventOddsHistoryPoint[];
}

export interface EventOddsHistoryView {
  event_id: string;
  series: EventOddsHistorySeries[];
}

export interface OddsChangeEntry {
  event_id: string;
  event_title: string;
  chosen_option: string;
  previous_odds: number;
  current_odds: number;
  stake: number;
  potential_payout_before: number;
  potential_payout_after: number;
}

export interface OddsConflictDetails {
  code: "ODDS_CHANGED";
  bet_type: "SIMPLE" | "PARLAY";
  changes: OddsChangeEntry[];
  total_potential_payout_before: number;
  total_potential_payout_after: number;
}

export interface EventProposalView {
  id: string;
  title: string;
  description: string | null;
  suggested_date: string | null;
  status: ProposalStatus;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  user: EventSearchUser;
  reviewer: {
    id: string;
    pseudo: string;
    email: string;
  } | null;
}

export interface CreateEventPayload {
  title: string;
  description?: string | null;
  proposal_id?: string;
  image_url?: string | null;
  options: string[];
  option_initial_odds?: Record<string, number>;
  closing_at?: string | null;
  min_bet: number;
  max_bet?: number | null;
  excluded_user_ids?: string[];
}

export interface UpdateEventPayload {
  title?: string;
  description?: string | null;
  image_url?: string | null;
  options?: string[];
  option_initial_odds?: Record<string, number>;
  closing_at?: string | null;
  min_bet?: number;
  max_bet?: number | null;
  excluded_user_ids?: string[];
}

export interface CreateProposalPayload {
  title: string;
  description?: string | null;
  suggested_date?: string | null;
}
