import {
  type CasinoGameType,
  JackpotRoundStatus,
  PrismaClient,
  type Prisma,
  type JackpotEntry,
} from "@prisma/client";
import { logger } from "../utils/logger";
import { prisma } from "./prisma.service";

const JACKPOT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const JACKPOT_BASE_POT = 500;
const JACKPOT_CONTRIBUTION_RATE_BPS = 800;
const JACKPOT_TICKET_UNIT = 25;

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

type JackpotState = {
  current_round: {
    id: string;
    label: string;
    current_pot: number;
    seed_amount: number;
    contribution_rate_bps: number;
    ticket_unit_amount: number;
    starts_at: string;
    ends_at: string;
    total_tickets: number;
    user_tickets: number;
    user_entries: number;
    user_contribution: number;
    user_chance_bps: number;
  };
  last_result: {
    round_id: string;
    label: string;
    payout_amount: number;
    resolved_at: string | null;
    winner: {
      id: string;
      pseudo: string;
    } | null;
  } | null;
};

function isPrismaErrorLike(error: unknown): error is { code?: unknown; message?: unknown; meta?: unknown } {
  return typeof error === "object" && error !== null;
}

function stringifyPrismaMeta(meta: unknown) {
  if (!meta) {
    return "";
  }

  try {
    return JSON.stringify(meta).toLowerCase();
  } catch {
    return "";
  }
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (isPrismaErrorLike(error) && typeof error.message === "string") {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "unknown error";
}

export function isJackpotStorageUnavailable(error: unknown) {
  if (!isPrismaErrorLike(error)) {
    return false;
  }

  const code = typeof error.code === "string" ? error.code : null;
  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
  const meta = stringifyPrismaMeta(error.meta);
  const mentionsJackpotStorage =
    message.includes("jackpotentry") ||
    message.includes("jackpotround") ||
    meta.includes("jackpotentry") ||
    meta.includes("jackpotround");

  return mentionsJackpotStorage && (code === "P2021" || code === "P2022");
}

function logJackpotStorageFallback(operation: string, error: unknown) {
  logger.warn(
    `Jackpot storage unavailable during ${operation}; continuing in degraded mode (${getErrorDetails(error)})`,
  );
}

export function buildUnavailableJackpotState(now = new Date()): JackpotState {
  return {
    current_round: {
      id: "jackpot-unavailable",
      label: "Jackpot indisponible",
      current_pot: 0,
      seed_amount: 0,
      contribution_rate_bps: JACKPOT_CONTRIBUTION_RATE_BPS,
      ticket_unit_amount: JACKPOT_TICKET_UNIT,
      starts_at: now.toISOString(),
      ends_at: getRoundEnd(now).toISOString(),
      total_tickets: 0,
      user_tickets: 0,
      user_entries: 0,
      user_contribution: 0,
      user_chance_bps: 0,
    },
    last_result: null,
  };
}

function buildRoundLabel(date: Date) {
  return `Jackpot ${date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  })}`;
}

function getRoundEnd(date: Date) {
  return new Date(date.getTime() + JACKPOT_DURATION_MS);
}

function pickWinningEntry(entries: JackpotEntry[]) {
  const totalTickets = entries.reduce((sum, entry) => sum + entry.tickets, 0);

  if (totalTickets <= 0) {
    return null;
  }

  let cursor = Math.floor(Math.random() * totalTickets);

  for (const entry of entries) {
    cursor -= entry.tickets;

    if (cursor < 0) {
      return entry;
    }
  }

  return entries.at(-1) ?? null;
}

class JackpotService {
  private getClient(client?: DatabaseClient) {
    return client ?? prisma;
  }

  private async createRound(now: Date, client?: DatabaseClient) {
    const db = this.getClient(client);

    return db.jackpotRound.create({
      data: {
        label: buildRoundLabel(now),
        seedAmount: JACKPOT_BASE_POT,
        currentPot: JACKPOT_BASE_POT,
        contributionRateBps: JACKPOT_CONTRIBUTION_RATE_BPS,
        ticketUnitAmount: JACKPOT_TICKET_UNIT,
        startsAt: now,
        endsAt: getRoundEnd(now),
      },
    });
  }

  private async findActiveRound(client?: DatabaseClient) {
    const db = this.getClient(client);

    return db.jackpotRound.findFirst({
      where: { status: JackpotRoundStatus.ACTIVE },
      orderBy: { startsAt: "desc" },
    });
  }

  private async settleExpiredRound(now: Date, client?: DatabaseClient) {
    const db = this.getClient(client);
    const activeRound = await this.findActiveRound(db);

    if (!activeRound || activeRound.endsAt > now) {
      return activeRound;
    }

    const entries = await db.jackpotEntry.findMany({
      where: { roundId: activeRound.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const winnerEntry = pickWinningEntry(entries);
    const statusUpdate = await db.jackpotRound.updateMany({
      where: {
        id: activeRound.id,
        status: JackpotRoundStatus.ACTIVE,
      },
      data: {
        status: JackpotRoundStatus.RESOLVED,
        resolvedAt: now,
        payoutAmount: winnerEntry ? activeRound.currentPot : 0,
        winnerEntryId: winnerEntry?.id ?? null,
        winnerUserId: winnerEntry?.userId ?? null,
      },
    });

    if (statusUpdate.count === 1 && winnerEntry && activeRound.currentPot > 0) {
      await db.user.update({
        where: { id: winnerEntry.userId },
        data: { balance: { increment: activeRound.currentPot } },
      });
    }

    return null;
  }

  private async ensureActiveRound(client?: DatabaseClient) {
    const db = this.getClient(client);
    const now = new Date();

    await this.settleExpiredRound(now, db);

    const activeRound = await this.findActiveRound(db);

    if (activeRound) {
      return activeRound;
    }

    return this.createRound(now, db);
  }

  async recordCasinoContribution(
    userId: string,
    wagerAmount: number,
    sourceGameType: CasinoGameType,
    sourceReference?: string,
    client?: DatabaseClient,
  ) {
    try {
      const db = this.getClient(client);
      const round = await this.ensureActiveRound(db);
      const contributionAmount = Math.max(
        1,
        Math.round((wagerAmount * round.contributionRateBps) / 10000),
      );
      const tickets = Math.max(1, Math.ceil(wagerAmount / round.ticketUnitAmount));

      await Promise.all([
        db.jackpotEntry.create({
          data: {
            roundId: round.id,
            userId,
            sourceGameType,
            sourceReference: sourceReference ?? null,
            wagerAmount,
            contributionAmount,
            tickets,
          },
        }),
        db.jackpotRound.update({
          where: { id: round.id },
          data: {
            currentPot: { increment: contributionAmount },
          },
        }),
      ]);

      return { roundId: round.id, contributionAmount, tickets };
    } catch (error) {
      if (isJackpotStorageUnavailable(error)) {
        logJackpotStorageFallback("casino contribution recording", error);

        return {
          roundId: null,
          contributionAmount: 0,
          tickets: 0,
        };
      }

      throw error;
    }
  }

  async getState(userId: string, client?: DatabaseClient) {
    try {
      const db = this.getClient(client);
      const activeRound = await this.ensureActiveRound(db);

      const [entries, lastResolvedRound] = await Promise.all([
        db.jackpotEntry.findMany({
          where: { roundId: activeRound.id },
        }),
        db.jackpotRound.findFirst({
          where: { status: JackpotRoundStatus.RESOLVED },
          include: {
            winner: {
              select: {
                id: true,
                pseudo: true,
              },
            },
          },
          orderBy: { resolvedAt: "desc" },
        }),
      ]);

      const totalTickets = entries.reduce(
        (sum: number, entry: JackpotEntry) => sum + entry.tickets,
        0,
      );
      const userEntries = entries.filter((entry: JackpotEntry) => entry.userId === userId);
      const userTickets = userEntries.reduce(
        (sum: number, entry: JackpotEntry) => sum + entry.tickets,
        0,
      );
      const userContribution = userEntries.reduce(
        (sum: number, entry: JackpotEntry) => sum + entry.contributionAmount,
        0,
      );
      const userChanceBps =
        totalTickets > 0 ? Math.round((userTickets / totalTickets) * 10000) : 0;

      return {
        current_round: {
          id: activeRound.id,
          label: activeRound.label,
          current_pot: activeRound.currentPot,
          seed_amount: activeRound.seedAmount,
          contribution_rate_bps: activeRound.contributionRateBps,
          ticket_unit_amount: activeRound.ticketUnitAmount,
          starts_at: activeRound.startsAt.toISOString(),
          ends_at: activeRound.endsAt.toISOString(),
          total_tickets: totalTickets,
          user_tickets: userTickets,
          user_entries: userEntries.length,
          user_contribution: userContribution,
          user_chance_bps: userChanceBps,
        },
        last_result: lastResolvedRound
          ? {
              round_id: lastResolvedRound.id,
              label: lastResolvedRound.label,
              payout_amount: lastResolvedRound.payoutAmount ?? 0,
              resolved_at: lastResolvedRound.resolvedAt?.toISOString() ?? null,
              winner: lastResolvedRound.winner
                ? {
                    id: lastResolvedRound.winner.id,
                    pseudo: lastResolvedRound.winner.pseudo,
                  }
                : null,
            }
          : null,
      };
    } catch (error) {
      if (isJackpotStorageUnavailable(error)) {
        logJackpotStorageFallback("jackpot state read", error);
        return buildUnavailableJackpotState();
      }

      throw error;
    }
  }
}

export const jackpotService = new JackpotService();
