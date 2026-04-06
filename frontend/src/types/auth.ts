export type UserRole = "user" | "validator" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  pseudo: string;
  balance: number;
  role: UserRole;
  avatar_url: string | null;
  streak_days: number;
  accept_odds_changes: boolean;
  last_reward_at: string | null;
  created_at: string;
  chat_panel_width:  number | null;
  chat_panel_height: number | null;
  chat_panel_x:      number | null;
  chat_panel_y:      number | null;
  chat_zoom:         number | null;
}

export interface RefreshSessionResponse {
  access_token: string;
}

export interface MicrosoftRedirectResponse {
  redirect_url: string;
}
