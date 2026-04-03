import test from "node:test";
import assert from "node:assert/strict";
import { gamificationService } from "../src/services/gamification.service";
import { jackpotService } from "../src/services/jackpot.service";
import { prisma } from "../src/lib/prisma";

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

function createMissingJackpotTableError(message: string) {
  return {
    code: "P2021",
    message,
    meta: { modelName: "JackpotContribution" },
  };
}

test("getState falls back to zeroed jackpot stats when jackpot storage is unavailable", async () => {
  const restores = [
    stubProperty(prisma.user, "findUnique", async () => ({
      id: "user-1",
      email: "student@epita.fr",
      pseudo: "SigmaStudent",
      avatarUrl: null,
      balance: 1320,
      role: "user",
      streakDays: 6,
      lastRewardAt: new Date("2026-04-02T12:00:00.000Z"),
      isBanned: false,
      createdAt: new Date("2026-04-01T12:00:00.000Z"),
      updatedAt: new Date("2026-04-02T12:00:00.000Z"),
      hashedPassword: null,
      microsoftId: null,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      sessionVersion: 0,
    })) as never,
    stubProperty(prisma.bet, "count", async ({ where }: { where: { status?: string } }) =>
      where.status === "won" ? 2 : 3,
    ) as never,
    stubProperty(prisma.casinoGame, "count", async ({ where }: { where: { result?: string } }) =>
      where.result === "win" ? 1 : 4,
    ) as never,
    stubProperty(prisma.event, "count", async () => 0) as never,
    stubProperty(prisma.eventProposal, "count", async () => 0) as never,
    stubProperty(prisma.jackpotContribution, "count", async () => {
      throw createMissingJackpotTableError("The table `public.JackpotContribution` does not exist.");
    }) as never,
    stubProperty(prisma.jackpotContribution, "aggregate", async () => {
      throw createMissingJackpotTableError("The table `public.JackpotContribution` does not exist.");
    }) as never,
    stubProperty(prisma.badge, "createMany", async () => ({ count: 0 })) as never,
    stubProperty(prisma.badge, "findMany", async () => []) as never,
    stubProperty(jackpotService, "getState", async () => {
      throw createMissingJackpotTableError("The table `public.JackpotContribution` does not exist.");
    }) as never,
  ];

  try {
    const state = await gamificationService.getState("user-1");

    assert.equal(state.stats.jackpot_entries, 0);
    assert.equal(state.stats.jackpot_tickets, 0);
    assert.equal(state.progress.find((item) => item.key === "jackpot_hunter")?.current, 0);
    assert.equal(state.jackpot.current_pot, 0);
    assert.equal(state.jackpot.user_contribution_total, 0);
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});

test("recordCasinoContribution degrades cleanly when jackpot persistence tables are unavailable", async () => {
  const jackpot = {
    id: "jackpot-main",
    currentAmount: 980,
    contributionRateBps: 100,
    totalContributed: 980,
    lastWinnerId: null,
    lastWinAmount: null,
    lastWinAt: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  };

  const restores = [
    stubProperty(prisma.jackpot, "findFirst", async () => jackpot) as never,
    stubProperty(prisma.jackpotContribution, "create", async () => {
      throw createMissingJackpotTableError("The table `public.JackpotContribution` does not exist.");
    }) as never,
    stubProperty(prisma.jackpot, "update", async () => jackpot) as never,
  ];

  try {
    const contribution = await jackpotService.recordCasinoContribution(
      "user-1",
      50,
      "roulette",
      "game-1",
    );

    assert.equal(contribution.jackpotId, null);
    assert.equal(contribution.contributionAmount, 0);
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});
