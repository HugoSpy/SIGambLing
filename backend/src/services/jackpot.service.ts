import { type CasinoGameType, JackpotRoundStatus, PrismaClient, type Prisma } from "@prisma/client";
import { prisma } from "./prisma.service";

const JACKPOT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const JACKPOT_BASE_POT = 500;
const JACKPOT_CONTRIBUTION_RATE_BPS = 800;
const JACKPOT_TICKET_UNIT = 25;

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

function buildRoundLabel(date: Date) {
  return `Jackpot ${date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  })}`;
}

function getRoundEnd(date: Date) {
  return new Date(date.getTime() + JACKPOT_DURATION_MS);
}

function pickWinningEntry<T extends { tickets: number }>(entries: T[]) {
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
  }

  async getState(userId: string, client?: DatabaseClient) {
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

    const totalTickets = entries.reduce((sum, entry) => sum + entry.tickets, 0);
    const userEntries = entries.filter((entry) => entry.userId === userId);
    const userTickets = userEntries.reduce((sum, entry) => sum + entry.tickets, 0);
    const userContribution = userEntries.reduce((sum, entry) => sum + entry.contributionAmount, 0);
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
  }
}

export const jackpotService = new JackpotService();
