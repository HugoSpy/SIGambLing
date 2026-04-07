import { PrismaClient, type Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { prisma } from "./prisma.service";

const JACKPOT_CONTRIBUTION_RATE_BPS = 500;

type DatabaseClient = PrismaClient | Prisma.TransactionClient;
type JackpotContributionSource =
  | "event_simple"
  | "event_parlay"
  | "casino_roulette"
  | "casino_blackjack";

type JackpotState = {
  current_pot: number;
  contribution_rate_bps: number;
  total_contributed: number;
  user_contribution_total: number;
  user_contribution_count: number;
  updated_at: string;
  last_result: {
    payout_amount: number;
    won_at: string | null;
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
    message.includes("jackpot") ||
    message.includes("jackpotcontribution") ||
    meta.includes("jackpot") ||
    meta.includes("jackpotcontribution");

  return mentionsJackpotStorage && (code === "P2021" || code === "P2022");
}

function logJackpotStorageFallback(operation: string, error: unknown) {
  logger.warn(
    `Jackpot storage unavailable during ${operation}; continuing in degraded mode (${getErrorDetails(error)})`,
  );
}

export function buildUnavailableJackpotState(now = new Date()): JackpotState {
  return {
    current_pot: 0,
    contribution_rate_bps: JACKPOT_CONTRIBUTION_RATE_BPS,
    total_contributed: 0,
    user_contribution_total: 0,
    user_contribution_count: 0,
    updated_at: now.toISOString(),
    last_result: null,
  };
}

class JackpotService {
  private getClient(client?: DatabaseClient) {
    return client ?? prisma;
  }

  private async ensureJackpot(client?: DatabaseClient) {
    const db = this.getClient(client);
    const existing = await db.jackpot.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      return existing;
    }

    return db.jackpot.create({
      data: {
        currentAmount: 0,
        contributionRateBps: JACKPOT_CONTRIBUTION_RATE_BPS,
        totalContributed: 0,
      },
    });
  }

  private async addContribution(
    userId: string,
    wagerAmount: number,
    sourceType: JackpotContributionSource,
    sourceReference?: string,
    client?: DatabaseClient,
  ) {
    try {
      const db = this.getClient(client);
      const jackpot = await this.ensureJackpot(db);
      const contributionAmount = (wagerAmount * jackpot.contributionRateBps) / 10000;

      await Promise.all([
        db.jackpotContribution.create({
          data: {
            jackpotId: jackpot.id,
            userId,
            sourceType,
            sourceReference: sourceReference ?? null,
            wagerAmount,
            contributionAmount,
          },
        }),
        db.jackpot.update({
          where: { id: jackpot.id },
          data: {
            currentAmount: { increment: contributionAmount },
            totalContributed: { increment: contributionAmount },
          },
        }),
      ]);

      return {
        jackpotId: jackpot.id,
        contributionAmount,
      };
    } catch (error) {
      if (isJackpotStorageUnavailable(error)) {
        logJackpotStorageFallback("jackpot contribution recording", error);

        return {
          jackpotId: null,
          contributionAmount: 0,
        };
      }

      throw error;
    }
  }

  async recordCasinoContribution(
    userId: string,
    wagerAmount: number,
    sourceGameType: "roulette" | "blackjack",
    sourceReference?: string,
    client?: DatabaseClient,
  ) {
    return this.addContribution(
      userId,
      wagerAmount,
      sourceGameType === "roulette" ? "casino_roulette" : "casino_blackjack",
      sourceReference,
      client,
    );
  }

  async recordEventContribution(
    userId: string,
    wagerAmount: number,
    betType: "simple" | "parlay",
    sourceReference?: string,
    client?: DatabaseClient,
  ) {
    return this.addContribution(
      userId,
      wagerAmount,
      betType === "parlay" ? "event_parlay" : "event_simple",
      sourceReference,
      client,
    );
  }

  async triggerGoldEventWinner(winnerUserId: string, client?: DatabaseClient) {
    try {
      const db = this.getClient(client);
      const jackpot = await this.ensureJackpot(db);

      if (jackpot.currentAmount <= 0) {
        throw new AppError("Le jackpot est vide.", 400);
      }

      const winner = await db.user.findUnique({
        where: { id: winnerUserId },
        select: {
          id: true,
          pseudo: true,
          isBanned: true,
        },
      });

      if (!winner || winner.isBanned) {
        throw new AppError("Gagnant jackpot introuvable.", 404);
      }

      const payoutAmount = jackpot.currentAmount;
      const roundedPayout = Math.round(payoutAmount);
      const wonAt = new Date();

      await db.user.update({
        where: { id: winner.id },
        data: {
          balance: { increment: roundedPayout },
        },
      });

      await db.jackpot.update({
        where: { id: jackpot.id },
        data: {
          currentAmount: 0,
          lastWinnerId: winner.id,
          lastWinAmount: payoutAmount,
          lastWinAt: wonAt,
        },
      });

      return {
        payout_amount: payoutAmount,
        won_at: wonAt.toISOString(),
        winner: {
          id: winner.id,
          pseudo: winner.pseudo,
        },
      };
    } catch (error) {
      if (isJackpotStorageUnavailable(error)) {
        logJackpotStorageFallback("jackpot payout", error);
        throw new AppError("Le jackpot est indisponible.", 503);
      }

      throw error;
    }
  }

  async getState(userId: string, client?: DatabaseClient): Promise<JackpotState> {
    try {
      const db = this.getClient(client);
      const jackpot = await this.ensureJackpot(db);
      const [userContributionCount, userContributionAggregate, currentJackpot] =
        await Promise.all([
          db.jackpotContribution.count({ where: { userId, jackpotId: jackpot.id } }),
          db.jackpotContribution.aggregate({
            where: { userId, jackpotId: jackpot.id },
            _sum: { contributionAmount: true },
          }),
          db.jackpot.findUnique({
            where: { id: jackpot.id },
            include: {
              lastWinner: {
                select: {
                  id: true,
                  pseudo: true,
                },
              },
            },
          }),
        ]);

      if (!currentJackpot) {
        return buildUnavailableJackpotState();
      }

      return {
        current_pot: currentJackpot.currentAmount,
        contribution_rate_bps: currentJackpot.contributionRateBps,
        total_contributed: currentJackpot.totalContributed,
        user_contribution_total: userContributionAggregate._sum.contributionAmount ?? 0,
        user_contribution_count: userContributionCount,
        updated_at: currentJackpot.updatedAt.toISOString(),
        last_result: currentJackpot.lastWinAt
          ? {
              payout_amount: currentJackpot.lastWinAmount ?? 0,
              won_at: currentJackpot.lastWinAt.toISOString(),
              winner: currentJackpot.lastWinner
                ? {
                    id: currentJackpot.lastWinner.id,
                    pseudo: currentJackpot.lastWinner.pseudo,
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
