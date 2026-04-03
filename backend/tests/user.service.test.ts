import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../src/utils/app-error";
import { prisma } from "../src/services/prisma.service";
import { gamificationService } from "../src/services/gamification.service";
import { userService } from "../src/services/user.service";

function stubProperty<T extends object, K extends keyof T>(
  target: T,
  key: K,
  replacement: T[K],
) {
  const original = target[key];
  target[key] = replacement;

  return () => {
    target[key] = original;
  };
}

function createUser(overrides?: Partial<{
  balance: number;
  claimedGitHubBonus: boolean;
  isBanned: boolean;
}>) {
  return {
    id: "user-1",
    email: "student@epita.fr",
    pseudo: "SigmaStudent",
    avatarUrl: null,
    balance: overrides?.balance ?? 1000,
    role: "user",
    isBanned: overrides?.isBanned ?? false,
    sessionVersion: 0,
    lastRewardAt: null,
    streakDays: 0,
    claimedGitHubBonus: overrides?.claimedGitHubBonus ?? false,
    acceptOddsChanges: false,
    createdAt: new Date("2026-04-01T12:00:00.000Z"),
    updatedAt: new Date("2026-04-01T12:00:00.000Z"),
  };
}

test("claimGitHubBonus credits 300 tokens once and exposes the claimed flag", async () => {
  const claimedUser = createUser({ balance: 1300, claimedGitHubBonus: true });
  let synchronizedUserId: string | null = null;

  const transaction = {
    user: {
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => claimedUser,
    },
  };

  const restores = [
    stubProperty(prisma, "$transaction", async (callback: (client: typeof transaction) => unknown) =>
      callback(transaction as never),
    ) as never,
    stubProperty(
      gamificationService,
      "synchronizeUserBadges",
      async (userId: string) => {
        synchronizedUserId = userId;
      },
    ) as never,
  ];

  try {
    const result = await userService.claimGitHubBonus("user-1");

    assert.equal(result.amount, 300);
    assert.equal(result.user.balance, 1300);
    assert.equal(result.user.claimed_github_bonus, true);
    assert.equal(synchronizedUserId, "user-1");
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});

test("claimGitHubBonus rejects repeated claims", async () => {
  const existingUser = createUser({ claimedGitHubBonus: true });

  const transaction = {
    user: {
      updateMany: async () => ({ count: 0 }),
      findUnique: async () => existingUser,
    },
  };

  const restores = [
    stubProperty(prisma, "$transaction", async (callback: (client: typeof transaction) => unknown) =>
      callback(transaction as never),
    ) as never,
  ];

  try {
    await assert.rejects(
      () => userService.claimGitHubBonus("user-1"),
      (error: unknown) =>
        error instanceof AppError &&
        error.statusCode === 409 &&
        error.message === "Bonus GitHub deja recupere.",
    );
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});
