export type EventStatus = "OPEN" | "CLOSED" | "RESOLVED" | "CANCELLED";
export type EventCategory = "sports" | "politics" | "culture" | "epita";
export type EventBetStatus = "PENDING" | "WON" | "LOST" | "CANCELLED";

export interface EventOptionView {
  label: string;
  pool: number;
  percentage: number;
  odds: number | null;
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

export interface EventBetView {
  id: string;
  user_id: string;
  event_id: string;
  chosen_option: string;
  amount: number;
  odd_at_bet: number;
  payout: number | null;
  created_at: string;
}

export interface EventBetHistoryItem extends EventBetView {
  status: EventBetStatus;
  event: {
    id: string;
    title: string;
    category: EventCategory;
    status: EventStatus;
    resolved_option: string | null;
    closing_at: string | null;
    image_url: string | null;
  };
}

export interface EventView {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
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
  created_by: EventUserSummary | null;
  my_bet: EventBetView | null;
}

export interface AdminEventView {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
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
  created_by: EventUserSummary;
  excluded_users: EventSearchUser[];
  bet_count: number;
}

export interface CreateEventPayload {
  title: string;
  description?: string | null;
  category: EventCategory;
  image_url?: string | null;
  options: string[];
  closing_at?: string | null;
  min_bet: number;
  max_bet?: number | null;
  excluded_user_ids?: string[];
}

export interface UpdateEventPayload {
  title?: string;
  description?: string | null;
  category?: EventCategory;
  image_url?: string | null;
  options?: string[];
  closing_at?: string | null;
  min_bet?: number;
  max_bet?: number | null;
  excluded_user_ids?: string[];
}
