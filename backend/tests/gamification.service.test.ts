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
    meta: { modelName: "JackpotEntry" },
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
    stubProperty(prisma.jackpotEntry, "count", async () => {
      throw createMissingJackpotTableError("The table `public.JackpotEntry` does not exist.");
    }) as never,
    stubProperty(prisma.jackpotEntry, "aggregate", async () => {
      throw createMissingJackpotTableError("The table `public.JackpotEntry` does not exist.");
    }) as never,
    stubProperty(prisma.badge, "createMany", async () => ({ count: 0 })) as never,
    stubProperty(prisma.badge, "findMany", async () => []) as never,
    stubProperty(jackpotService, "getState", async () => {
      throw createMissingJackpotTableError("The table `public.JackpotEntry` does not exist.");
    }) as never,
  ];

  try {
    const state = await gamificationService.getState("user-1");

    assert.equal(state.stats.jackpot_entries, 0);
    assert.equal(state.stats.jackpot_tickets, 0);
    assert.equal(state.progress.find((item) => item.key === "jackpot_hunter")?.current, 0);
    assert.equal(state.jackpot.current_round.id, "jackpot-unavailable");
    assert.equal(state.jackpot.current_round.user_tickets, 0);
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});

test("recordCasinoContribution degrades cleanly when jackpot persistence tables are unavailable", async () => {
  const activeRound = {
    id: "round-1",
    label: "Jackpot 03 avr.",
    currentPot: 980,
    seedAmount: 500,
    contributionRateBps: 800,
    ticketUnitAmount: 25,
    startsAt: new Date("2026-04-01T00:00:00.000Z"),
    endsAt: new Date("2026-04-08T00:00:00.000Z"),
    resolvedAt: null,
    payoutAmount: null,
    winnerUserId: null,
    winnerEntryId: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    status: "ACTIVE",
  };

  const restores = [
    stubProperty(prisma.jackpotRound, "findFirst", async () => activeRound) as never,
    stubProperty(prisma.jackpotEntry, "create", async () => {
      throw createMissingJackpotTableError("The table `public.JackpotEntry` does not exist.");
    }) as never,
    stubProperty(prisma.jackpotRound, "update", async () => activeRound) as never,
  ];

  try {
    const contribution = await jackpotService.recordCasinoContribution(
      "user-1",
      50,
      "roulette",
      "game-1",
    );

    assert.equal(contribution.roundId, null);
    assert.equal(contribution.contributionAmount, 0);
    assert.equal(contribution.tickets, 0);
  } finally {
    while (restores.length > 0) {
      restores.pop()?.();
    }
  }
});
