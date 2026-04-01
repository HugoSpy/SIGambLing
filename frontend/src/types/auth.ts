export type UserRole = "user" | "validator" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  pseudo: string;
  balance: number;
  role: UserRole;
  avatar_url: string | null;
  streak_days: number;
  last_reward_at: string | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
}

export interface MicrosoftRedirectResponse {
  redirect_url: string;
}
