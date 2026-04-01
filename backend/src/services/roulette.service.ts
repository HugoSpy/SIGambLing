import type { CasinoGameResult, CasinoGameType } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { spinRoulette } from "../utils/roulette-rng";
import { prisma } from "./prisma.service";
import type { RouletteSpinInput } from "../schemas/casino.schemas";

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

type RouletteBetInput = RouletteSpinInput["bets"][number];

class RouletteService {
  private getMultiplier(betType: RouletteBetInput["type"]) {
    if (betType.startsWith("number_")) {
      return 36;
    }

    const multipliers: Record<string, number> = {
      red: 2,
      black: 2,
      even: 2,
      odd: 2,
      "1-18": 2,
      "19-36": 2,
      dozen_1: 3,
      dozen_2: 3,
      dozen_3: 3,
      column_1: 3,
      column_2: 3,
      column_3: 3,
    };

    return multipliers[betType] ?? 1;
  }

  private isBetWinning(betType: RouletteBetInput["type"], result: number) {
    if (betType === "red") {
      return RED_NUMBERS.has(result);
    }

    if (betType === "black") {
      return BLACK_NUMBERS.has(result);
    }

    if (betType === "even") {
      return result !== 0 && result % 2 === 0;
    }

    if (betType === "odd") {
      return result !== 0 && result % 2 === 1;
    }

    if (betType === "1-18") {
      return result >= 1 && result <= 18;
    }

    if (betType === "19-36") {
      return result >= 19 && result <= 36;
    }

    if (betType === "dozen_1") {
      return result >= 1 && result <= 12;
    }

    if (betType === "dozen_2") {
      return result >= 13 && result <= 24;
    }

    if (betType === "dozen_3") {
      return result >= 25 && result <= 36;
    }

    if (betType === "column_1") {
      return result !== 0 && result % 3 === 1;
    }

    if (betType === "column_2") {
      return result !== 0 && result % 3 === 2;
    }

    if (betType === "column_3") {
      return result !== 0 && result % 3 === 0;
    }

    if (betType.startsWith("number_")) {
      return result === Number(betType.split("_")[1]);
    }

    return false;
  }

  private getColor(result: number) {
    if (result === 0) {
      return "green" as const;
    }

    if (RED_NUMBERS.has(result)) {
      return "red" as const;
    }

    return "black" as const;
  }

  async spin(userId: string, bets: RouletteSpinInput["bets"]) {
    const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
        isBanned: true,
      },
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
        where: {
          id: userId,
          isBanned: false,
          balance: {
            gte: totalBet,
          },
        },
        data: {
          balance: {
            decrement: totalBet,
          },
        },
      });

      if (debited.count !== 1) {
        throw new AppError("Balance insuffisante.", 400);
      }

      if (totalPayout > 0) {
        await transaction.user.update({
          where: { id: userId },
          data: {
            balance: {
              increment: totalPayout,
            },
          },
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

      const updatedUser = await transaction.user.findUnique({
        where: { id: userId },
        select: {
          balance: true,
        },
      });

      if (!updatedUser) {
        throw new AppError("Utilisateur introuvable après transaction.", 500);
      }

      return {
        game,
        newBalance: updatedUser.balance,
      };
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
