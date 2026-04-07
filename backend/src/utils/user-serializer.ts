import type { User } from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    pseudo: user.pseudo,
    balance: user.balance,
    role: user.role,
    avatar_url: user.avatarUrl,
    streak_days: user.streakDays,
    accept_odds_changes: user.acceptOddsChanges,
    last_reward_at: user.lastRewardAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
    chat_panel_width:  user.chatPanelWidth  ?? null,
    chat_panel_height: user.chatPanelHeight ?? null,
    chat_panel_x:      user.chatPanelX      ?? null,
    chat_panel_y:      user.chatPanelY      ?? null,
    chat_zoom:         user.chatZoom        ?? null,
    theme_preference:  user.themePreference as "dark" | "light",
  };
}
