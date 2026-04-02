import type { CasinoGameResult, CasinoGameType } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { spinRoulette } from "../utils/roulette-rng";
import { gamificationService } from "./gamification.service";
import { jackpotService } from "./jackpot.service";
import { prisma } from "./prisma.service";
import type { RouletteSpinInput } from "../schemas/casino.schemas";

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);
const VALID_CORNER_STARTS = new Set([
  1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31,
  32,
]);
const VALID_SIXLINE_STARTS = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31]);
const VALID_STREET_STARTS = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);

type RouletteBetInput = RouletteSpinInput["bets"][number];

function parseBetNumbers(betType: string, prefix: string, expectedParts: number) {
  const parts = betType.split("_");
  if (parts.length !== expectedParts || parts[0] !== prefix) {
    return null;
  }

  const values = parts.slice(1).map((part) => Number(part));
  if (values.some((value) => !Number.isInteger(value))) {
    return null;
  }

  return values;
}

function isStraightBetType(betType: string) {
  const values = parseBetNumbers(betType, "number", 2);
  return values !== null && values[0] >= 0 && values[0] <= 36;
}

function isSplitBetType(betType: string) {
  const values = parseBetNumbers(betType, "split", 3);
  if (!values) {
    return false;
  }

  const [a, b] = values;
  if (a < 1 || b > 36 || a >= b) {
    return false;
  }

  const diff = b - a;
  return diff === 3 || (diff === 1 && a % 3 !== 0);
}

function isStreetBetType(betType: string) {
  const values = parseBetNumbers(betType, "street", 2);
  return values !== null && VALID_STREET_STARTS.has(values[0]);
}

function isCornerBetType(betType: string) {
  const values = parseBetNumbers(betType, "corner", 2);
  return values !== null && VALID_CORNER_STARTS.has(values[0]);
}

function isSixlineBetType(betType: string) {
  const values = parseBetNumbers(betType, "sixline", 2);
  return values !== null && VALID_SIXLINE_STARTS.has(values[0]);
}

class RouletteService {
  private getMultiplier(betType: string): number {
    if (isStraightBetType(betType)) return 36;
    if (isSplitBetType(betType)) return 18;
    if (isStreetBetType(betType)) return 12;
    if (isCornerBetType(betType)) return 9;
    if (isSixlineBetType(betType)) return 6;

    const multipliers: Record<string, number> = {
      red: 2, black: 2, even: 2, odd: 2,
      "1-18": 2, "19-36": 2,
      dozen_1: 3, dozen_2: 3, dozen_3: 3,
      column_1: 3, column_2: 3, column_3: 3,
    };

    const m = multipliers[betType];
    if (m === undefined) throw new AppError(`Type de pari inconnu : ${betType}`, 400);
    return m;
  }

  private isBetWinning(betType: string, result: number): boolean {
    if (betType === "red") return RED_NUMBERS.has(result);
    if (betType === "black") return BLACK_NUMBERS.has(result);
    if (betType === "even") return result !== 0 && result % 2 === 0;
    if (betType === "odd") return result !== 0 && result % 2 === 1;
    if (betType === "1-18") return result >= 1 && result <= 18;
    if (betType === "19-36") return result >= 19 && result <= 36;
    if (betType === "dozen_1") return result >= 1 && result <= 12;
    if (betType === "dozen_2") return result >= 13 && result <= 24;
    if (betType === "dozen_3") return result >= 25 && result <= 36;
    if (betType === "column_1") return result !== 0 && result % 3 === 1;
    if (betType === "column_2") return result !== 0 && result % 3 === 2;
    if (betType === "column_3") return result !== 0 && result % 3 === 0;

    if (isStraightBetType(betType)) {
      return result === Number(betType.split("_")[1]);
    }

    // split_A_B
    if (isSplitBetType(betType)) {
      const parts = betType.split("_");
      return result === Number(parts[1]) || result === Number(parts[2]);
    }

    // street_X → {X, X+1, X+2}
    if (isStreetBetType(betType)) {
      const x = Number(betType.split("_")[1]);
      return result >= x && result <= x + 2;
    }

    // corner_X → {X, X+1, X+3, X+4}
    if (isCornerBetType(betType)) {
      const x = Number(betType.split("_")[1]);
      return result === x || result === x + 1 || result === x + 3 || result === x + 4;
    }

    // sixline_X → {X, X+1, X+2, X+3, X+4, X+5}
    if (isSixlineBetType(betType)) {
      const x = Number(betType.split("_")[1]);
      return result >= x && result <= x + 5;
    }

    return false;
  }

  private getColor(result: number) {
    if (result === 0) return "green" as const;
    if (RED_NUMBERS.has(result)) return "red" as const;
    return "black" as const;
  }

  async spin(userId: string, bets: RouletteSpinInput["bets"]) {
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, isBanned: true },
    });

    if (!existingUser || existingUser.isBanned) {
      throw new AppError("Utilisateur introuvable ou banni.", 404);
    }

    if (existingUser.balance < totalBet) {
      throw new AppError("Balance insuffisante.", 400);
    }

    const resultNumber = spinRoulette();
    const resultColor = this.getColor(resultNumber);
    const winningBets = bets.filter((bet) => this.isBetWinning(bet.type, resultNumber));
    const totalPayout = winningBets.reduce(
      (sum, bet) => sum + bet.amount * this.getMultiplier(bet.type),
      0,
    );
    const result: CasinoGameResult = totalPayout > 0 ? "win" : "loss";
    const gameType: CasinoGameType = "roulette";

    const outcome = await prisma.$transaction(async (transaction) => {
      const debited = await transaction.user.updateMany({
        where: { id: userId, isBanned: false, balance: { gte: totalBet } },
        data: { balance: { decrement: totalBet } },
      });

      if (debited.count !== 1) {
        throw new AppError("Balance insuffisante.", 400);
      }

      if (totalPayout > 0) {
        await transaction.user.update({
          where: { id: userId },
          data: { balance: { increment: totalPayout } },
        });
      }

      const game = await transaction.casinoGame.create({
        data: {
          userId,
          gameType,
          betAmount: totalBet,
          result,
          payout: totalPayout - totalBet,
          gameData: {
            result_number: resultNumber,
            result_color: resultColor,
            bets,
            winning_bets: winningBets,
            total_payout: totalPayout,
          },
        },
      });

      await jackpotService.recordCasinoContribution(
        userId,
        totalBet,
        gameType,
        game.id,
        transaction,
      );

      const updatedUser = await transaction.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      await gamificationService.synchronizeUserBadges(userId, transaction);

      if (!updatedUser) {
        throw new AppError("Utilisateur introuvable après transaction.", 500);
      }

      return { game, newBalance: updatedUser.balance };
    });

    return {
      game_id: outcome.game.id,
      result_number: resultNumber,
      result_color: resultColor,
      result,
      bet_amount: totalBet,
      payout: totalPayout,
      new_balance: outcome.newBalance,
      winning_bets: winningBets.map((bet) => bet.type),
    };
  }
}

export const rouletteService = new RouletteService();
