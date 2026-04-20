import type { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { gamificationService } from "./gamification.service";
import { jackpotService } from "./jackpot.service";
import { prisma } from "./prisma.service";
import * as robinHoodService from "./robin-hood.service";

const TOTAL_CELLS = 25;
const MIN_BET = 10;
const HOUSE_EDGE = 0.01;

interface MinesSession {
  id: string;
  userId: string;
  betAmount: number;
  minesCount: number;
  minePositions: number[];
  revealedCells: number[];
  gemsFound: number;
  status: "active" | "won" | "lost";
  currentMultiplier: number;
  nextMultiplier: number;
  createdAt: Date;
  lastActivityAt: Date;
  robinEventId: string | null;
}

export interface MinesStartResult {
  gemsTotal: number;
  minesCount: number;
  betAmount: number;
  currentMultiplier: number;
  nextMultiplier: number;
  balance: number;
}

export interface MinesRevealResult {
  result: "gem" | "mine";
  cellIndex: number;
  gemsFound?: number;
  currentMultiplier?: number;
  nextMultiplier?: number;
  potentialWin?: number;
  minePositions?: number[]; // Only on game over
  gameStatus: "active" | "lost";
  balance?: number;
}

export interface MinesCashoutResult {
  payout: number;
  multiplier: number;
  minePositions: number[];
  gameStatus: "won";
  balance: number;
}

export interface MinesAutobetResult {
  win: boolean;
  payout: number;
  profit: number;
  cells: number[];
  multiplier: number;
  newBalance: number;
}

export interface MinesCurrentResult {
  gemsTotal: number;
  minesCount: number;
  betAmount: number;
  revealedCells: number[];
  gemsFound: number;
  currentMultiplier: number;
  nextMultiplier: number;
  potentialWin: number;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const activeSessions = new Map<string, MinesSession>();

function getMinesMultiplier(mines: number, gemsFound: number, fair = false): number {
  if (gemsFound === 0) return 1;
  const totalGems = TOTAL_CELLS - mines;
  let survivalProb = 1;
  for (let i = 0; i < gemsFound; i++) {
    survivalProb *= (totalGems - i) / (TOTAL_CELLS - i);
  }
  const edge = fair ? 0 : HOUSE_EDGE;
  return Math.round((1 / survivalProb) * (1 - edge) * 100) / 100;
}

function getNextMultiplierFair(mines: number, gemsFound: number): number {
  return getMinesMultiplier(mines, gemsFound + 1, true);
}

function getNextMultiplier(mines: number, gemsFound: number): number {
  return getMinesMultiplier(mines, gemsFound + 1);
}

function placeMines(count: number): number[] {
  const positions = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
  // Fisher-Yates shuffle, take first `count` positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j]!, positions[i]!];
  }
  return positions.slice(0, count).sort((a, b) => a - b);
}

function isSessionExpired(session: MinesSession): boolean {
  return Date.now() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS;
}

function getActiveSession(userId: string): MinesSession {
  const session = activeSessions.get(userId);
  if (!session) throw new AppError("Aucune partie en cours.", 404);
  if (isSessionExpired(session)) {
    activeSessions.delete(userId);
    throw new AppError("La session a expiré. Lancez une nouvelle partie.", 404);
  }
  return session;
}

class MinesService {
  async start(userId: string, betAmount: number, minesCount: number): Promise<MinesStartResult> {
    const existing = activeSessions.get(userId);
    if (existing && !isSessionExpired(existing)) {
      throw new AppError("Une partie est déjà en cours.", 409);
    }
    activeSessions.delete(userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("Utilisateur introuvable.", 404);
    if (user.balance < betAmount) throw new AppError("Solde insuffisant.", 400);

    // Robin des Slots check
    const robinEvent = await robinHoodService.getActiveEvent();
    if (robinEvent) {
      const isVictim = await prisma.robinHoodVictim.findFirst({ where: { eventId: robinEvent.id, userId } });
      if (isVictim) throw new AppError("Tu ne peux pas jouer pendant que tu es la victime de Robin des Slots.", 403);
    }
    const robinEventId = robinEvent?.id ?? null;
    const fairMult = (mines: number, gems: number) => getMinesMultiplier(mines, gems, !!robinEventId);
    const fairNext = (mines: number, gems: number) => robinEventId ? getNextMultiplierFair(mines, gems) : getNextMultiplier(mines, gems);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: betAmount } },
    });

    await jackpotService.recordCasinoContribution(userId, betAmount, "mines");

    const minePositions = placeMines(minesCount);
    const session: MinesSession = {
      id: crypto.randomUUID(),
      userId,
      betAmount,
      minesCount,
      minePositions,
      revealedCells: [],
      gemsFound: 0,
      status: "active",
      currentMultiplier: 1,
      nextMultiplier: fairNext(minesCount, 0),
      createdAt: new Date(),
      lastActivityAt: new Date(),
      robinEventId,
    };
    activeSessions.set(userId, session);

    return {
      gemsTotal: TOTAL_CELLS - minesCount,
      minesCount,
      betAmount,
      currentMultiplier: 1,
      nextMultiplier: session.nextMultiplier,
      balance: updated.balance,
    };
  }

  async reveal(userId: string, cellIndex: number): Promise<MinesRevealResult> {
    const session = getActiveSession(userId);

    if (session.revealedCells.includes(cellIndex)) {
      throw new AppError("Cette case est déjà révélée.", 400);
    }

    session.lastActivityAt = new Date();

    const isMine = session.minePositions.includes(cellIndex);

    if (isMine) {
      session.status = "lost";
      activeSessions.delete(userId);

      const gameData: Prisma.InputJsonValue = {
        minesCount: session.minesCount,
        gemsFound: session.gemsFound,
        minePositions: session.minePositions,
        revealedCells: session.revealedCells,
        finalCell: cellIndex,
      };
      await prisma.casinoGame.create({
        data: {
          userId,
          gameType: "mines",
          betAmount: session.betAmount,
          result: "loss",
          payout: 0,
          gameData,
        },
      });
      await gamificationService.synchronizeUserBadges(userId);
      await gamificationService.triggerLeaderboardTop3(userId);
      if (session.robinEventId) {
        await robinHoodService.addToPool(session.robinEventId, session.betAmount);
      }

      return {
        result: "mine",
        cellIndex,
        minePositions: session.minePositions,
        gameStatus: "lost",
      };
    }

    // Gem found
    session.revealedCells.push(cellIndex);
    session.gemsFound++;
    session.currentMultiplier = getMinesMultiplier(session.minesCount, session.gemsFound, !!session.robinEventId);
    session.nextMultiplier = session.robinEventId
      ? getNextMultiplierFair(session.minesCount, session.gemsFound)
      : getNextMultiplier(session.minesCount, session.gemsFound);

    const potentialWin = Math.floor(session.betAmount * session.currentMultiplier);

    return {
      result: "gem",
      cellIndex,
      gemsFound: session.gemsFound,
      currentMultiplier: session.currentMultiplier,
      nextMultiplier: session.nextMultiplier,
      potentialWin,
      gameStatus: "active",
    };
  }

  async cashout(userId: string): Promise<MinesCashoutResult> {
    const session = getActiveSession(userId);

    if (session.gemsFound === 0) {
      throw new AppError("Révélez au moins une gemme avant d'encaisser.", 400);
    }

    const payout = Math.floor(session.betAmount * session.currentMultiplier);
    session.status = "won";
    activeSessions.delete(userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: payout } },
    });

    const gameData: Prisma.InputJsonValue = {
      minesCount: session.minesCount,
      gemsFound: session.gemsFound,
      finalMultiplier: session.currentMultiplier,
      minePositions: session.minePositions,
      revealedCells: session.revealedCells,
    };
    await prisma.casinoGame.create({
      data: {
        userId,
        gameType: "mines",
        betAmount: session.betAmount,
        result: "win",
        payout: payout - session.betAmount,
        gameData,
      },
    });

    await gamificationService.synchronizeUserBadges(userId);
    await gamificationService.triggerLeaderboardTop3(userId);
    if (session.robinEventId && payout > session.betAmount) {
      await robinHoodService.deductFromPool(session.robinEventId, payout - session.betAmount);
    }

    return {
      payout,
      multiplier: session.currentMultiplier,
      minePositions: session.minePositions,
      gameStatus: "won",
      balance: updated.balance,
    };
  }

  getCurrent(userId: string): MinesCurrentResult {
    const session = getActiveSession(userId);
    const potentialWin = Math.floor(session.betAmount * session.currentMultiplier);
    return {
      gemsTotal: TOTAL_CELLS - session.minesCount,
      minesCount: session.minesCount,
      betAmount: session.betAmount,
      revealedCells: session.revealedCells,
      gemsFound: session.gemsFound,
      currentMultiplier: session.currentMultiplier,
      nextMultiplier: session.nextMultiplier,
      potentialWin,
    };
  }

  async autobet(
    userId: string,
    betAmount: number,
    minesCount: number,
    selectedCells: number[] | "random",
    gemCount: number,
  ): Promise<MinesAutobetResult> {
    // Input validation
    if (!betAmount || betAmount <= 0) throw new AppError("betAmount must be > 0", 400);
    if (betAmount < MIN_BET) throw new AppError(`La mise minimum est de ${MIN_BET} tokens.`, 400);

    // Block if a manual session is active
    const existing = activeSessions.get(userId);
    if (existing && !isSessionExpired(existing)) {
      throw new AppError("Une partie manuelle est en cours.", 409);
    }
    if (existing) activeSessions.delete(userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("Utilisateur introuvable.", 404);
    if (user.balance < betAmount) throw new AppError("Solde insuffisant.", 400);

    const minePositions = placeMines(minesCount);
    const totalGems = TOTAL_CELLS - minesCount;
    // Default gemCount to 1 when not provided (random mode without explicit count)
    const safeGemCount = Number.isFinite(gemCount) && gemCount > 0 ? gemCount : 1;
    const clampedGemCount = Math.min(Math.max(1, safeGemCount), totalGems);

    // Determine which cells to play
    let cellsToPlay: number[];
    if (selectedCells === "random") {
      // Pick clampedGemCount cells from all cells (mines included) — genuine random play
      const allCells = Array.from({ length: TOTAL_CELLS }, (_, i) => i);
      for (let i = allCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCells[i], allCells[j]] = [allCells[j]!, allCells[i]!];
      }
      cellsToPlay = allCells.slice(0, clampedGemCount);
    } else {
      cellsToPlay = selectedCells;
    }

    // Deduct bet upfront
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: betAmount } },
    });
    await jackpotService.recordCasinoContribution(userId, betAmount, "mines");

    // Simulate reveals — stop at first mine
    const revealedGems: number[] = [];
    let hitMine = false;
    for (const cell of cellsToPlay) {
      if (minePositions.includes(cell)) {
        hitMine = true;
        break;
      }
      revealedGems.push(cell);
    }

    if (hitMine) {
      // Loss
      const gameData: Prisma.InputJsonValue = {
        minesCount,
        gemsFound: revealedGems.length,
        minePositions,
        revealedCells: revealedGems,
        hitMineCell: cellsToPlay[revealedGems.length],
        autobet: true,
      };
      await prisma.casinoGame.create({
        data: { userId, gameType: "mines", betAmount, result: "loss", payout: 0, gameData },
      });
      await gamificationService.synchronizeUserBadges(userId);
      await gamificationService.triggerLeaderboardTop3(userId);

      const after = await prisma.user.findUnique({ where: { id: userId } });
      return {
        win: false,
        payout: 0,
        profit: -betAmount,
        cells: revealedGems,
        multiplier: 1,
        newBalance: after!.balance,
      };
    }

    // All selected cells are gems — cashout
    const gemsFound = revealedGems.length;
    const multiplier = getMinesMultiplier(minesCount, gemsFound);
    const payout = Math.floor(betAmount * multiplier);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: payout } },
    });

    const gameData: Prisma.InputJsonValue = {
      minesCount,
      gemsFound,
      finalMultiplier: multiplier,
      minePositions,
      revealedCells: revealedGems,
      autobet: true,
    };
    await prisma.casinoGame.create({
      data: {
        userId,
        gameType: "mines",
        betAmount,
        result: "win",
        payout: payout - betAmount,
        gameData,
      },
    });
    await gamificationService.synchronizeUserBadges(userId);
    await gamificationService.triggerLeaderboardTop3(userId);

    return {
      win: true,
      payout,
      profit: payout - betAmount,
      cells: revealedGems,
      multiplier,
      newBalance: updated.balance,
    };
  }
}

export const minesService = new MinesService();
