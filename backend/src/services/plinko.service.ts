import type { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { gamificationService } from "./gamification.service";
import { jackpotService } from "./jackpot.service";
import { prisma } from "./prisma.service";
import { getMultipliers, type RiskLevel } from "../utils/plinko-multipliers";
import * as robinHoodService from "./robin-hood.service";

const PLINKO_RTP = 0.985;

const MIN_BET = 10;

export interface PlinkoResult {
  path: boolean[];
  slotIndex: number;
  multiplier: number;
  payout: number;
  profit: number;
  newBalance: number;
}

class PlinkoService {
  async dropBall(
    userId: string,
    betAmount: number,
    rows: number,
    risk: RiskLevel,
  ): Promise<PlinkoResult> {
    if (!Number.isInteger(betAmount) || betAmount < MIN_BET) {
      throw new AppError(`La mise minimum est de ${MIN_BET} tokens.`, 400);
    }
    if (!Number.isInteger(rows) || rows < 8 || rows > 16) {
      throw new AppError("rows doit être un entier entre 8 et 16.", 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("Utilisateur introuvable.", 404);
    if (user.balance < betAmount) throw new AppError("Solde insuffisant.", 400);

    // Robin des Slots check
    const robinEvent = await robinHoodService.getActiveEvent();
    if (robinEvent) {
      const isVictim = await prisma.robinHoodVictim.findFirst({ where: { eventId: robinEvent.id, userId } });
      if (isVictim) throw new AppError("Tu ne peux pas jouer pendant que tu es la victime de Robin des Slots.", 403);
    }

    // Generate path: `rows` random left/right decisions
    const path: boolean[] = Array.from({ length: rows }, () => Math.random() < 0.5);
    const slotIndex = path.filter(Boolean).length;

    const multipliers = getMultipliers(rows, risk);
    const multiplier = multipliers[slotIndex]!;
    // Robin ACTIVE : corriger RTP 98.5% → 100% via facteur 1/0.985
    const robinFactor = robinEvent ? 1 / PLINKO_RTP : 1;
    const grossPayout = Math.floor(betAmount * multiplier * robinFactor);
    const profit = grossPayout - betAmount;

    // Atomic balance update: deduct bet, credit payout
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: profit } },
    });

    // 1% jackpot contribution
    await jackpotService.recordCasinoContribution(userId, betAmount, "plinko");

    const gameData: Prisma.InputJsonValue = { path, slotIndex, multiplier, rows, risk };
    await prisma.casinoGame.create({
      data: {
        userId,
        gameType: "plinko",
        betAmount,
        result: profit > 0 ? "win" : "loss",
        payout: profit,
        gameData,
      },
    });

    await gamificationService.synchronizeUserBadges(userId);
    await gamificationService.triggerLeaderboardTop3(userId);

    if (robinEvent) {
      if (grossPayout > betAmount) {
        await robinHoodService.deductFromPool(robinEvent.id, grossPayout - betAmount);
      } else if (grossPayout < betAmount) {
        await robinHoodService.addToPool(robinEvent.id, betAmount - grossPayout);
      }
    }

    return { path, slotIndex, multiplier, payout: grossPayout, profit, newBalance: updated.balance };
  }
}

export const plinkoService = new PlinkoService();
