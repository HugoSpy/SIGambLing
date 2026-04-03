import test from "node:test";
import assert from "node:assert/strict";
import {
  blackjackService,
  blackjackServiceTestUtils,
  type BlackjackCard,
} from "../src/services/blackjack.service";
import { gamificationService } from "../src/services/gamification.service";
import { jackpotService } from "../src/services/jackpot.service";
import { prisma } from "../src/lib/prisma";

function withRiggedDeck(cards: BlackjackCard[]) {
  blackjackServiceTestUtils.setDeckFactory(() => [...cards]);
}

function buildInsuranceBlackjackDeck(): BlackjackCard[] {
  return [
    { rank: "2", suit: "clubs" },
    { rank: "K", suit: "spades" },
    { rank: "A", suit: "hearts" },
    { rank: "9", suit: "diamonds" },
    { rank: "10", suit: "clubs" },
  ];
}

test("insure pays 2:1 when the dealer has blackjack on an ace upcard", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalFindUnique = prismaAny.user.findUnique;
  const originalUpdateMany = prismaAny.user.updateMany;
  const originalUpdate = prismaAny.user.update;
  const originalCasinoGameCreate = prismaAny.casinoGame.create;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;
  const originalRecordCasinoContribution = jackpotService.recordCasinoContribution;

  let balance = 1000;
  let savedGame: Record<string, unknown> | null = null;

  withRiggedDeck(buildInsuranceBlackjackDeck());

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      user: {
        updateMany: async ({ data }: { data: { balance: { decrement: number } } }) => {
          balance -= data.balance.decrement;
          return { count: 1 };
        },
      },
    });
  prismaAny.user.findUnique = async ({ select }: { select: Record<string, unknown> }) =>
    select.isBanned !== undefined ? { balance, isBanned: false } : { balance };
  prismaAny.user.updateMany = async ({ data }: { data: { balance: { decrement: number } } }) => {
    balance -= data.balance.decrement;
    return { count: 1 };
  };
  prismaAny.user.update = async ({ data }: { data: { balance: { increment: number } } }) => {
    balance += data.balance.increment;
    return { balance };
  };
  prismaAny.casinoGame.create = async ({ data }: { data: Record<string, unknown> }) => {
    savedGame = data;
    return data;
  };
  (gamificationService as any).synchronizeUserBadges = async () => undefined;
  (jackpotService as any).recordCasinoContribution = async () => undefined;

  try {
    const deal = await blackjackService.deal("user-1", 100);

    assert.equal(deal.status, "playing");
    assert.equal(deal.insurance_available, true);
    assert.equal(deal.new_balance, 900);

    const insured = await blackjackService.insure("user-1", deal.game_id);

    assert.equal(insured.status, "resolved");
    assert.equal(insured.result, "loss");
    assert.equal(insured.insurance_bet, 50);
    assert.equal(insured.insurance_payout, 150);
    assert.equal(insured.payout, 150);
    assert.equal(insured.new_balance, 1000);
    assert.equal(savedGame?.betAmount, 150);
    assert.equal(savedGame?.payout, 0);
  } finally {
    prismaAny.$transaction = originalTransaction;
    prismaAny.user.findUnique = originalFindUnique;
    prismaAny.user.updateMany = originalUpdateMany;
    prismaAny.user.update = originalUpdate;
    prismaAny.casinoGame.create = originalCasinoGameCreate;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
    (jackpotService as any).recordCasinoContribution = originalRecordCasinoContribution;
    blackjackServiceTestUtils.resetDeckFactory();
    blackjackServiceTestUtils.clearSessions();
  }
});

test("player actions reveal a pending dealer blackjack before drawing when insurance is declined", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalFindUnique = prismaAny.user.findUnique;
  const originalUpdateMany = prismaAny.user.updateMany;
  const originalUpdate = prismaAny.user.update;
  const originalCasinoGameCreate = prismaAny.casinoGame.create;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;
  const originalRecordCasinoContribution = jackpotService.recordCasinoContribution;

  let balance = 1000;

  withRiggedDeck(buildInsuranceBlackjackDeck());

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      user: {
        updateMany: async ({ data }: { data: { balance: { decrement: number } } }) => {
          balance -= data.balance.decrement;
          return { count: 1 };
        },
      },
    });
  prismaAny.user.findUnique = async ({ select }: { select: Record<string, unknown> }) =>
    select.isBanned !== undefined ? { balance, isBanned: false } : { balance };
  prismaAny.user.updateMany = async ({ data }: { data: { balance: { decrement: number } } }) => {
    balance -= data.balance.decrement;
    return { count: 1 };
  };
  prismaAny.user.update = async ({ data }: { data: { balance: { increment: number } } }) => {
    balance += data.balance.increment;
    return { balance };
  };
  prismaAny.casinoGame.create = async ({ data }: { data: Record<string, unknown> }) => data;
  (gamificationService as any).synchronizeUserBadges = async () => undefined;
  (jackpotService as any).recordCasinoContribution = async () => undefined;

  try {
    const deal = await blackjackService.deal("user-1", 100);
    const resolved = await blackjackService.hit("user-1", deal.game_id);

    assert.equal(resolved.status, "resolved");
    assert.equal(resolved.result, "loss");
    assert.equal(resolved.player_hand?.length, 2);
    assert.equal(resolved.dealer_total, 21);
    assert.equal(resolved.new_balance, 900);
  } finally {
    prismaAny.$transaction = originalTransaction;
    prismaAny.user.findUnique = originalFindUnique;
    prismaAny.user.updateMany = originalUpdateMany;
    prismaAny.user.update = originalUpdate;
    prismaAny.casinoGame.create = originalCasinoGameCreate;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
    (jackpotService as any).recordCasinoContribution = originalRecordCasinoContribution;
    blackjackServiceTestUtils.resetDeckFactory();
    blackjackServiceTestUtils.clearSessions();
  }
});
