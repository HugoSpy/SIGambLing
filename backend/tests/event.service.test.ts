import test from "node:test";
import assert from "node:assert/strict";
import { EventStatus, ProposalStatus } from "@prisma/client";
import { eventService } from "../src/services/event.service";
import { gamificationService } from "../src/services/gamification.service";
import { jackpotService } from "../src/services/jackpot.service";
import { prisma } from "../src/lib/prisma";

function buildStoredOptions() {
  return [
    {
      label: "Oui",
      initial_odds: 1.9,
      current_odds: 1.9,
      total_staked: 0,
      is_winning: null,
    },
    {
      label: "Non",
      initial_odds: 1.9,
      current_odds: 1.9,
      total_staked: 0,
      is_winning: null,
    },
  ];
}

function buildAdminEvent() {
  const options = buildStoredOptions();
  const now = new Date("2026-04-03T10:00:00.000Z");

  return {
    id: "event-1",
    title: "Le SIG passera-t-il la soutenance ?",
    description: "Description",
    imageUrl: null,
    options,
    poolByOption: { Oui: 0, Non: 0 },
    totalPool: 0,
    status: EventStatus.OPEN,
    resolvedOption: null,
    closingAt: new Date("2026-04-10T10:00:00.000Z"),
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    minBet: 10,
    maxBet: null,
    createdBy: {
      id: "admin-1",
      pseudo: "admin",
    },
    excludedUsers: [],
    _count: {
      bets: 0,
    },
  };
}

function buildEventRecord(overrides: Partial<ReturnType<typeof buildAdminEvent>> = {}) {
  const base = buildAdminEvent();

  return {
    ...base,
    bets: [],
    excludedUsers: [],
    ...overrides,
  };
}

function buildCreatedBet(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-04-03T10:05:00.000Z");

  return {
    id: "bet-1",
    userId: "user-1",
    eventId: "event-1",
    chosenOption: "Oui",
    amount: 10,
    oddAtBet: 1.9,
    status: "pending",
    type: "SIMPLE",
    potentialWin: 19,
    payout: null,
    createdAt: now,
    resolvedAt: null,
    legs: [
      {
        id: "leg-1",
        eventId: "event-1",
        chosenOption: "Oui",
        oddsAtBet: 1.9,
        status: "pending",
        event: {
          id: "event-1",
          title: "Le SIG passera-t-il la soutenance ?",
          status: EventStatus.OPEN,
          resolvedOption: null,
          closingAt: new Date("2026-04-10T10:00:00.000Z"),
          imageUrl: null,
        },
      },
    ],
    ...overrides,
  };
}

test("createEvent approves a linked pending proposal in the same transaction", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;
  const captured = {
    proposalUpdate: null as null | Record<string, unknown>,
    logs: [] as Array<Record<string, unknown>>,
  };

  (gamificationService as any).synchronizeUserBadges = async () => undefined;

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      eventProposal: {
        findUnique: async () => ({
          id: "proposal-1",
          status: ProposalStatus.PENDING,
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          captured.proposalUpdate = data;
          return null;
        },
      },
      event: {
        create: async () => buildAdminEvent(),
      },
      oddsHistory: {
        createMany: async () => null,
      },
      adminLog: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          captured.logs.push(data);
          return null;
        },
      },
    });

  try {
    const created = await eventService.createEvent("admin-1", {
      title: "Le SIG passera-t-il la soutenance ?",
      description: "Description",
      proposal_id: "proposal-1",
      image_url: null,
      options: ["Oui", "Non"],
      option_initial_odds: { Oui: 1.9, Non: 1.9 },
      closing_at: new Date("2026-04-10T10:00:00.000Z"),
      min_bet: 10,
      max_bet: null,
      excluded_user_ids: [],
    });

    assert.equal(created.id, "event-1");
    assert.equal(captured.proposalUpdate?.status, ProposalStatus.APPROVED);
    assert.equal(captured.proposalUpdate?.reviewedById, "admin-1");
    assert.ok(captured.proposalUpdate?.reviewedAt instanceof Date);
    assert.equal(captured.proposalUpdate?.rejectionReason, null);
    assert.equal(captured.logs.length, 2);
    assert.equal(captured.logs[1]?.actionType, "proposal_approved");
    assert.deepEqual(captured.logs[1]?.details, { event_id: "event-1" });
  } finally {
    prismaAny.$transaction = originalTransaction;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
  }
});

test("createEvent rejects already reviewed proposals before creating the event", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  let eventCreated = false;

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      eventProposal: {
        findUnique: async () => ({
          id: "proposal-1",
          status: ProposalStatus.APPROVED,
        }),
      },
      event: {
        create: async () => {
          eventCreated = true;
          return buildAdminEvent();
        },
      },
    });

  try {
    await assert.rejects(
      () =>
        eventService.createEvent("admin-1", {
          title: "Le SIG passera-t-il la soutenance ?",
          description: "Description",
          proposal_id: "proposal-1",
          image_url: null,
          options: ["Oui", "Non"],
          option_initial_odds: { Oui: 1.9, Non: 1.9 },
          closing_at: new Date("2026-04-10T10:00:00.000Z"),
          min_bet: 10,
          max_bet: null,
          excluded_user_ids: [],
        }),
      /Seules les propositions en attente peuvent être converties en événement/,
    );

    assert.equal(eventCreated, false);
  } finally {
    prismaAny.$transaction = originalTransaction;
  }
});

test("placeSimpleBets closes expired events before rejecting the basket", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalUpdateMany = prismaAny.event.updateMany;
  const updates: Array<Record<string, unknown>> = [];

  prismaAny.event.updateMany = async () => ({ count: 0 });
  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findMany: async () => [
          {
            id: "event-1",
            title: "Marche expire",
            status: EventStatus.OPEN,
            closingAt: new Date("2026-04-01T10:00:00.000Z"),
            minBet: 10,
            maxBet: null,
            options: buildStoredOptions(),
            poolByOption: { Oui: 0, Non: 0 },
            bets: [],
            excludedUsers: [],
          },
        ],
        update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          updates.push({ where, data });
          return null;
        },
      },
      user: {
        findUnique: async () => ({
          id: "user-1",
          isBanned: false,
          acceptOddsChanges: false,
        }),
      },
    });

  try {
    await assert.rejects(
      () =>
        eventService.placeSimpleBets("user-1", {
          bets: [
            {
              eventId: "event-1",
              chosenOption: "Oui",
              amount: 10,
            },
          ],
        }),
      /Un des événements du panier est déjà fermé/,
    );

    assert.deepEqual(updates, [
      {
        where: { id: "event-1" },
        data: { status: EventStatus.CLOSED },
      },
    ]);
  } finally {
    prismaAny.$transaction = originalTransaction;
    prismaAny.event.updateMany = originalUpdateMany;
  }
});

test("placeSimpleBets progressively blends odds once the transition-liquidity band is reached", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalUpdateMany = prismaAny.event.updateMany;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;
  const originalRecordEventContribution = jackpotService.recordEventContribution;
  const captured = {
    eventUpdates: [] as Array<Record<string, any>>,
    historyBatches: [] as Array<Array<Record<string, any>>>,
  };

  prismaAny.event.updateMany = async () => ({ count: 0 });
  (gamificationService as any).synchronizeUserBadges = async () => undefined;
  (jackpotService as any).recordEventContribution = async () => ({
    jackpotId: "jackpot-main",
    contributionAmount: 14,
  });
  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findMany: async () => [
          buildEventRecord({
            options: [
              {
                label: "Oui",
                initial_odds: 1.9,
                current_odds: 1.9,
                total_staked: 300,
                is_winning: null,
              },
              {
                label: "Non",
                initial_odds: 1.9,
                current_odds: 1.9,
                total_staked: 0,
                is_winning: null,
              },
            ],
            poolByOption: { Oui: 300, Non: 0 },
            totalPool: 300,
          }),
        ],
        update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          captured.eventUpdates.push({ where, data });
          return null;
        },
      },
      user: {
        updateMany: async () => ({ count: 1 }),
        findUnique: async () => ({ balance: 3470 }),
      },
      bet: {
        create: async ({ data }: { data: Record<string, any> }) =>
          buildCreatedBet({
            eventId: data.eventId,
            chosenOption: data.chosenOption,
            amount: data.amount,
            oddAtBet: data.oddAtBet,
            type: data.type,
            status: data.status,
            potentialWin: data.potentialWin,
            legs: [
              {
                id: "leg-1",
                eventId: data.eventId,
                chosenOption: data.chosenOption,
                oddsAtBet: data.legs.create.oddsAtBet,
                status: data.legs.create.status,
                event: {
                  id: data.eventId,
                  title: "Le SIG passera-t-il la soutenance ?",
                  status: EventStatus.OPEN,
                  resolvedOption: null,
                  closingAt: new Date("2026-04-10T10:00:00.000Z"),
                  imageUrl: null,
                },
              },
            ],
          }),
      },
      oddsHistory: {
        createMany: async ({ data }: { data: Array<Record<string, any>> }) => {
          captured.historyBatches.push(data);
          return null;
        },
      },
    });

  try {
    const outcome = await eventService.placeSimpleBets("user-1", {
      bets: [
        {
          eventId: "event-1",
          chosenOption: "Non",
          amount: 200,
        },
      ],
    });

    assert.equal(outcome.new_balance, 3470);
    assert.equal(outcome.bets[0]?.odds_at_bet, 1.9);
    assert.deepEqual(captured.eventUpdates, [
      {
        where: { id: "event-1" },
        data: {
          options: [
            {
              label: "Oui",
              initial_odds: 1.9,
              current_odds: 1.8583,
              total_staked: 300,
              is_winning: null,
            },
            {
              label: "Non",
              initial_odds: 1.9,
              current_odds: 1.9958,
              total_staked: 200,
              is_winning: null,
            },
          ],
          poolByOption: { Oui: 300, Non: 200 },
          totalPool: 500,
        },
      },
    ]);
    assert.deepEqual(captured.historyBatches, [
      [
        {
          eventId: "event-1",
          option: "Oui",
          odds: 1.8583,
          totalStaked: 300,
        },
        {
          eventId: "event-1",
          option: "Non",
          odds: 1.9958,
          totalStaked: 200,
        },
      ],
    ]);
  } finally {
    prismaAny.$transaction = originalTransaction;
    prismaAny.event.updateMany = originalUpdateMany;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
    (jackpotService as any).recordEventContribution = originalRecordEventContribution;
  }
});

test("placeSimpleBets keeps admin odds fixed while the pool stays below the liquidity floor", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalUpdateMany = prismaAny.event.updateMany;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;
  const originalRecordEventContribution = jackpotService.recordEventContribution;
  const captured: Array<Record<string, any>> = [];

  prismaAny.event.updateMany = async () => ({ count: 0 });
  (gamificationService as any).synchronizeUserBadges = async () => undefined;
  (jackpotService as any).recordEventContribution = async () => ({
    jackpotId: "jackpot-main",
    contributionAmount: 1,
  });
  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findMany: async () => [buildEventRecord()],
        update: async ({ data }: { data: Record<string, unknown> }) => {
          captured.push(data);
          return null;
        },
      },
      user: {
        updateMany: async () => ({ count: 1 }),
        findUnique: async () => ({ balance: 4900 }),
      },
      bet: {
        create: async ({ data }: { data: Record<string, any> }) =>
          buildCreatedBet({
            eventId: data.eventId,
            chosenOption: data.chosenOption,
            amount: data.amount,
            oddAtBet: data.oddAtBet,
            type: data.type,
            status: data.status,
            potentialWin: data.potentialWin,
            legs: [
              {
                id: "leg-1",
                eventId: data.eventId,
                chosenOption: data.chosenOption,
                oddsAtBet: data.legs.create.oddsAtBet,
                status: data.legs.create.status,
                event: {
                  id: data.eventId,
                  title: "Le SIG passera-t-il la soutenance ?",
                  status: EventStatus.OPEN,
                  resolvedOption: null,
                  closingAt: new Date("2026-04-10T10:00:00.000Z"),
                  imageUrl: null,
                },
              },
            ],
          }),
      },
      oddsHistory: {
        createMany: async () => null,
      },
    });

  try {
    await eventService.placeSimpleBets("user-1", {
      bets: [
        {
          eventId: "event-1",
          chosenOption: "Oui",
          amount: 100,
        },
      ],
    });

    assert.deepEqual(captured, [
      {
        options: [
          {
            label: "Oui",
            initial_odds: 1.9,
            current_odds: 1.9,
            total_staked: 100,
            is_winning: null,
          },
          {
            label: "Non",
            initial_odds: 1.9,
            current_odds: 1.9,
            total_staked: 0,
            is_winning: null,
          },
        ],
        poolByOption: { Oui: 100, Non: 0 },
        totalPool: 100,
      },
    ]);
  } finally {
    prismaAny.$transaction = originalTransaction;
    prismaAny.event.updateMany = originalUpdateMany;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
    (jackpotService as any).recordEventContribution = originalRecordEventContribution;
  }
});

// ─── rewindEvent ─────────────────────────────────────────────────────────────

test("rewindEvent throws 404 when the event does not exist", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findUnique: async () => null,
      },
    });

  try {
    await assert.rejects(
      () => eventService.rewindEvent("non-existent-event", "admin-1"),
      /Événement introuvable/,
    );
  } finally {
    prismaAny.$transaction = originalTransaction;
  }
});

test("rewindEvent throws 400 when the event is not RESOLVED", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findUnique: async () =>
          buildEventRecord({
            status: EventStatus.OPEN,
            resolvedAt: null,
          }),
      },
    });

  try {
    await assert.rejects(
      () => eventService.rewindEvent("event-1", "admin-1"),
      /Event is not resolved/,
    );
  } finally {
    prismaAny.$transaction = originalTransaction;
  }
});

test("rewindEvent deducts event gains, deletes casino games and other won bets, creates RewindLog", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;

  (gamificationService as any).synchronizeUserBadges = async () => undefined;

  const resolvedAt = new Date("2026-04-05T12:00:00.000Z");

  const captured = {
    userUpdates: [] as Array<Record<string, any>>,
    betUpdateMany: null as null | Record<string, any>,
    betLegUpdateMany: null as null | Record<string, any>,
    casinoDeleteMany: null as null | Record<string, any>,
    betDeleteManyOther: null as null | Record<string, any>,
    betLegDeleteManyOther: null as null | Record<string, any>,
    rewindLogCreate: null as null | Record<string, any>,
    adminLogCreate: null as null | Record<string, any>,
    eventUpdate: null as null | Record<string, any>,
  };

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findUnique: async () =>
          buildEventRecord({
            status: EventStatus.RESOLVED,
            resolvedAt,
            resolvedOption: "Oui",
          }),
        update: async ({ data }: { data: Record<string, any> }) => {
          captured.eventUpdate = data;
          return buildEventRecord({ status: EventStatus.CLOSED });
        },
      },
      bet: {
        // won bets on the rewinded event
        findMany: async ({ where }: { where: Record<string, any> }) => {
          if (where.eventId === "event-1" && where.status === "won") {
            return [{ userId: "user-1", payout: 190 }];
          }
          // event bets for BetLeg reset
          if (where.eventId === "event-1") {
            return [{ id: "bet-1" }, { id: "bet-2" }];
          }
          // other won bets created after resolvedAt
          if (where.status === "won" && where.eventId?.not === "event-1") {
            return [{ id: "other-bet-1", amount: 50 }];
          }
          return [];
        },
        updateMany: async ({ data }: { data: Record<string, any> }) => {
          captured.betUpdateMany = data;
          return { count: 2 };
        },
        deleteMany: async ({ where }: { where: Record<string, any> }) => {
          captured.betDeleteManyOther = where;
          return { count: 1 };
        },
      },
      betLeg: {
        updateMany: async ({ data }: { data: Record<string, any> }) => {
          captured.betLegUpdateMany = data;
          return { count: 2 };
        },
        deleteMany: async ({ where }: { where: Record<string, any> }) => {
          captured.betLegDeleteManyOther = where;
          return { count: 1 };
        },
      },
      casinoGame: {
        deleteMany: async ({ where }: { where: Record<string, any> }) => {
          captured.casinoDeleteMany = where;
          return { count: 3 };
        },
      },
      user: {
        findUnique: async () => ({ balance: 500 }),
        update: async ({ data }: { data: Record<string, any> }) => {
          captured.userUpdates.push(data);
          return null;
        },
      },
      rewindLog: {
        create: async ({ data }: { data: Record<string, any> }) => {
          captured.rewindLogCreate = data;
          return null;
        },
      },
      adminLog: {
        create: async ({ data }: { data: Record<string, any> }) => {
          captured.adminLogCreate = data;
          return null;
        },
      },
    });

  try {
    const result = await eventService.rewindEvent("event-1", "admin-1");

    // Event should come back as serialized admin event
    assert.equal(result.id, "event-1");

    // Casino games deleted for user-1 after resolvedAt
    assert.equal(captured.casinoDeleteMany?.userId, "user-1");
    assert.ok(captured.casinoDeleteMany?.createdAt?.gt instanceof Date);

    // Other won bets deleted
    assert.deepEqual(captured.betDeleteManyOther?.id?.in, ["other-bet-1"]);

    // BetLegs of deleted other bets deleted
    assert.deepEqual(captured.betLegDeleteManyOther?.betId?.in, ["other-bet-1"]);

    // User balance: 500 (balance) + 50 (refund stake) - 190 (event gains) = 360
    assert.equal(captured.userUpdates[0]?.balance, 360);

    // All bets on event reset
    assert.equal(captured.betUpdateMany?.status, "pending");
    assert.equal(captured.betUpdateMany?.payout, 0);
    assert.equal(captured.betUpdateMany?.resolvedAt, null);

    // BetLegs reset
    assert.equal(captured.betLegUpdateMany?.status, "pending");

    // Event updated to CLOSED with no resolvedOption / resolvedAt
    assert.equal(captured.eventUpdate?.status, EventStatus.CLOSED);
    assert.equal(captured.eventUpdate?.resolvedOption, null);
    assert.equal(captured.eventUpdate?.resolvedAt, null);

    // RewindLog created
    assert.equal(captured.rewindLogCreate?.eventId, "event-1");
    assert.equal(captured.rewindLogCreate?.adminId, "admin-1");
    assert.equal(captured.rewindLogCreate?.affectedUsers.length, 1);
    const affectedUser = captured.rewindLogCreate?.affectedUsers[0];
    assert.equal(affectedUser?.userId, "user-1");
    assert.equal(affectedUser?.gainsRecuperes, 190);
    assert.equal(affectedUser?.soldeAvant, 500);
    assert.equal(affectedUser?.soldeApres, 360);
    assert.equal(affectedUser?.casinoGamesSupprimes, 3);
    assert.equal(affectedUser?.betsAutresSupprimes, 1);

    // AdminLog created
    assert.equal(captured.adminLogCreate?.actionType, "event_rewinded");
    assert.equal(captured.adminLogCreate?.targetId, "event-1");
  } finally {
    prismaAny.$transaction = originalTransaction;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
  }
});

test("rewindEvent clamps user balance to 0 when gains exceed current balance", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;

  (gamificationService as any).synchronizeUserBadges = async () => undefined;

  const resolvedAt = new Date("2026-04-05T12:00:00.000Z");
  let capturedBalance: number | null = null;

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findUnique: async () =>
          buildEventRecord({
            status: EventStatus.RESOLVED,
            resolvedAt,
            resolvedOption: "Oui",
          }),
        update: async () => buildEventRecord({ status: EventStatus.CLOSED }),
      },
      bet: {
        findMany: async ({ where }: { where: Record<string, any> }) => {
          if (where.eventId === "event-1" && where.status === "won") {
            return [{ userId: "user-1", payout: 9999 }]; // gains >> balance
          }
          if (where.eventId === "event-1") {
            return [{ id: "bet-1" }];
          }
          return [];
        },
        updateMany: async () => ({ count: 1 }),
        deleteMany: async () => ({ count: 0 }),
      },
      betLeg: {
        updateMany: async () => ({ count: 0 }),
        deleteMany: async () => ({ count: 0 }),
      },
      casinoGame: {
        deleteMany: async () => ({ count: 0 }),
      },
      user: {
        findUnique: async () => ({ balance: 100 }),
        update: async ({ data }: { data: Record<string, any> }) => {
          capturedBalance = data.balance;
          return null;
        },
      },
      rewindLog: {
        create: async () => null,
      },
      adminLog: {
        create: async () => null,
      },
    });

  try {
    await eventService.rewindEvent("event-1", "admin-1");
    assert.equal(capturedBalance, 0);
  } finally {
    prismaAny.$transaction = originalTransaction;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
  }
});

test("rewindEvent skips users with no won bets and produces an empty affectedUsers list", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;

  (gamificationService as any).synchronizeUserBadges = async () => undefined;

  let capturedRewindLog: Record<string, any> | null = null;

  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findUnique: async () =>
          buildEventRecord({
            status: EventStatus.RESOLVED,
            resolvedAt: new Date("2026-04-05T12:00:00.000Z"),
            resolvedOption: "Oui",
          }),
        update: async () => buildEventRecord({ status: EventStatus.CLOSED }),
      },
      bet: {
        // No won bets on this event
        findMany: async ({ where }: { where: Record<string, any> }) => {
          if (where.eventId === "event-1") {
            return [{ id: "bet-1" }];
          }
          return [];
        },
        updateMany: async () => ({ count: 0 }),
        deleteMany: async () => ({ count: 0 }),
      },
      betLeg: {
        updateMany: async () => ({ count: 0 }),
        deleteMany: async () => ({ count: 0 }),
      },
      casinoGame: {
        deleteMany: async () => ({ count: 0 }),
      },
      user: {
        findUnique: async () => ({ balance: 1000 }),
        update: async () => null,
      },
      rewindLog: {
        create: async ({ data }: { data: Record<string, any> }) => {
          capturedRewindLog = data;
          return null;
        },
      },
      adminLog: {
        create: async () => null,
      },
    });

  try {
    await eventService.rewindEvent("event-1", "admin-1");
    assert.deepEqual(capturedRewindLog?.affectedUsers, []);
  } finally {
    prismaAny.$transaction = originalTransaction;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
  }
});

// ─── (existing tests below) ──────────────────────────────────────────────────

test("placeSimpleBets caps each odds move to 12% even in high-liquidity markets", async () => {
  const prismaAny = prisma as any;
  const originalTransaction = prismaAny.$transaction;
  const originalUpdateMany = prismaAny.event.updateMany;
  const originalSynchronizeUserBadges = gamificationService.synchronizeUserBadges;
  const originalRecordEventContribution = jackpotService.recordEventContribution;
  const captured = {
    eventUpdates: [] as Array<Record<string, any>>,
    historyBatches: [] as Array<Array<Record<string, any>>>,
  };

  prismaAny.event.updateMany = async () => ({ count: 0 });
  (gamificationService as any).synchronizeUserBadges = async () => undefined;
  (jackpotService as any).recordEventContribution = async () => ({
    jackpotId: "jackpot-main",
    contributionAmount: 6,
  });
  prismaAny.$transaction = async (callback: (tx: any) => Promise<unknown>) =>
    callback({
      event: {
        findMany: async () => [
          buildEventRecord({
            options: [
              {
                label: "Oui",
                initial_odds: 1.9,
                current_odds: 1.9,
                total_staked: 800,
                is_winning: null,
              },
              {
                label: "Non",
                initial_odds: 1.9,
                current_odds: 1.9,
                total_staked: 800,
                is_winning: null,
              },
            ],
            poolByOption: { Oui: 800, Non: 800 },
            totalPool: 1600,
          }),
        ],
        update: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          captured.eventUpdates.push({ where, data });
          return null;
        },
      },
      user: {
        updateMany: async () => ({ count: 1 }),
        findUnique: async () => ({ balance: 4300 }),
      },
      bet: {
        create: async ({ data }: { data: Record<string, any> }) =>
          buildCreatedBet({
            eventId: data.eventId,
            chosenOption: data.chosenOption,
            amount: data.amount,
            oddAtBet: data.oddAtBet,
            type: data.type,
            status: data.status,
            potentialWin: data.potentialWin,
            legs: [
              {
                id: "leg-1",
                eventId: data.eventId,
                chosenOption: data.chosenOption,
                oddsAtBet: data.legs.create.oddsAtBet,
                status: data.legs.create.status,
                event: {
                  id: data.eventId,
                  title: "Le SIG passera-t-il la soutenance ?",
                  status: EventStatus.OPEN,
                  resolvedOption: null,
                  closingAt: new Date("2026-04-10T10:00:00.000Z"),
                  imageUrl: null,
                },
              },
            ],
          }),
      },
      oddsHistory: {
        createMany: async ({ data }: { data: Array<Record<string, any>> }) => {
          captured.historyBatches.push(data);
          return null;
        },
      },
    });

  try {
    const outcome = await eventService.placeSimpleBets("user-1", {
      bets: [
        {
          eventId: "event-1",
          chosenOption: "Oui",
          amount: 600,
        },
      ],
    });

    assert.equal(outcome.new_balance, 4300);
    assert.equal(outcome.bets[0]?.odds_at_bet, 1.9);
    assert.deepEqual(captured.eventUpdates, [
      {
        where: { id: "event-1" },
        data: {
          options: [
            {
              label: "Oui",
              initial_odds: 1.9,
              current_odds: 1.672,
              total_staked: 1400,
              is_winning: null,
            },
            {
              label: "Non",
              initial_odds: 1.9,
              current_odds: 2.128,
              total_staked: 800,
              is_winning: null,
            },
          ],
          poolByOption: { Oui: 1400, Non: 800 },
          totalPool: 2200,
        },
      },
    ]);
    assert.deepEqual(captured.historyBatches, [
      [
        {
          eventId: "event-1",
          option: "Oui",
          odds: 1.672,
          totalStaked: 1400,
        },
        {
          eventId: "event-1",
          option: "Non",
          odds: 2.128,
          totalStaked: 800,
        },
      ],
    ]);
  } finally {
    prismaAny.$transaction = originalTransaction;
    prismaAny.event.updateMany = originalUpdateMany;
    (gamificationService as any).synchronizeUserBadges = originalSynchronizeUserBadges;
    (jackpotService as any).recordEventContribution = originalRecordEventContribution;
  }
});
