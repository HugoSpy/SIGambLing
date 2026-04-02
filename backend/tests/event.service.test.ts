import test from "node:test";
import assert from "node:assert/strict";
import { EventCategory, EventStatus, ProposalStatus } from "@prisma/client";
import { eventService } from "../src/services/event.service";
import { gamificationService } from "../src/services/gamification.service";
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
    category: EventCategory.epita,
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
      category: EventCategory.epita,
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
          category: EventCategory.epita,
          proposal_id: "proposal-1",
          image_url: null,
          options: ["Oui", "Non"],
          option_initial_odds: { Oui: 1.9, Non: 1.9 },
          closing_at: new Date("2026-04-10T10:00:00.000Z"),
          min_bet: 10,
          max_bet: null,
          excluded_user_ids: [],
        }),
      /Seules les propositions en attente peuvent etre converties en evenement/,
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
      /Un des evenements du panier est deja ferme/,
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
