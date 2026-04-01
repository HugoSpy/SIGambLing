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
    last_reward_at: user.lastRewardAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
  };
}
