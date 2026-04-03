import type { AuthUser } from "../frontend/src/types/auth";

export function applyGitHubBonusClaim(user: AuthUser, amount: number): AuthUser {
  return {
    ...user,
    balance: user.balance + amount,
    claimed_github_bonus: true,
  };
}
