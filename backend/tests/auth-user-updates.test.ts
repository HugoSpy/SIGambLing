import test from "node:test";
import assert from "node:assert/strict";
import { applyGitHubBonusClaim } from "../../shared/auth-user-updates";

test("applyGitHubBonusClaim updates frontend auth state without mutating the source user", () => {
  const user = {
    id: "user-1",
    email: "student@epita.fr",
    pseudo: "SigmaStudent",
    balance: 1000,
    role: "user" as const,
    avatar_url: null,
    streak_days: 2,
    claimed_github_bonus: false,
    accept_odds_changes: false,
    last_reward_at: null,
    created_at: "2026-04-01T12:00:00.000Z",
  };

  const updatedUser = applyGitHubBonusClaim(user, 300);

  assert.notEqual(updatedUser, user);
  assert.equal(updatedUser.balance, 1300);
  assert.equal(updatedUser.claimed_github_bonus, true);
  assert.equal(user.balance, 1000);
  assert.equal(user.claimed_github_bonus, false);
});
