import type { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { gamificationService } from "./gamification.service";
import { jackpotService } from "./jackpot.service";
import { prisma } from "./prisma.service";
import * as robinHoodService from "./robin-hood.service";

type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export interface HiloCard {
  suit: Suit;
  value: number; // 1=As, 2-10, 11=J, 12=Q, 13=K
}

interface HiloSession {
  userId: string;
  initialBet: number;
  currentCard: HiloCard;
  accumulatedMultiplier: number;
  roundsPlayed: number;
  cardHistory: Array<{ card: HiloCard; multiplierAfter: number }>;
  startedAt: Date;
  lastActivityAt: Date;
  robinEventId: string | null;
}

export interface MultiplierEntry {
  probability: number;
  multiplier: number;
}

export interface HiloMultipliers {
  higherOrEqual: MultiplierEntry | null; // normal cards (2-12): ≥ current
  lowerOrEqual: MultiplierEntry | null;  // normal cards (2-12): ≤ current
  higher: MultiplierEntry | null;        // As (1): strictly higher
  lower: MultiplierEntry | null;         // Roi (13): strictly lower
  equal: MultiplierEntry | null;         // As & Roi: same value
}

export interface HiloStartResult {
  currentCard: HiloCard;
  multipliers: HiloMultipliers;
  balance: number;
}

export interface HiloPredictResult {
  correct: boolean;
  newCard: HiloCard;
  newMultiplier: number;
  multipliers: HiloMultipliers;
  gameOver: boolean;
  payout?: number;
  balance?: number;
}

export interface HiloSkipResult {
  newCard: HiloCard;
  multipliers: HiloMultipliers;
}

export interface HiloCashOutResult {
  payout: number;
  multiplier: number;
  balance: number;
}

export interface HiloCurrentResult {
  currentCard: HiloCard;
  multipliers: HiloMultipliers;
  accumulatedMultiplier: number;
  roundsPlayed: number;
  initialBet: number;
  potentialPayout: number;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MIN_BET = 10;
const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

const activeSessions = new Map<string, HiloSession>();

function drawRandomCard(): HiloCard {
  const suit = SUITS[Math.floor(Math.random() * 4)]!;
  const value = Math.floor(Math.random() * 13) + 1;
  return { suit, value };
}

function calcMultiplier(prob: number, fair = false): number {
  const edge = fair ? 1.0 : 0.97;
  return Math.max(1.0, Math.round((1 / prob) * edge * 100) / 100);
}

function makeEntry(prob: number, fair = false): MultiplierEntry {
  return { probability: prob, multiplier: calcMultiplier(prob, fair) };
}

function getMultipliersFair(value: number): HiloMultipliers {
  const DECK_SIZE = 52;
  if (value === 1) {
    return { higherOrEqual: null, lowerOrEqual: null, higher: makeEntry(48 / DECK_SIZE, true), lower: null, equal: makeEntry(4 / DECK_SIZE, true) };
  }
  if (value === 13) {
    return { higherOrEqual: null, lowerOrEqual: null, higher: null, lower: makeEntry(48 / DECK_SIZE, true), equal: makeEntry(4 / DECK_SIZE, true) };
  }
  const pHigherOrEqual = ((13 - value + 1) * 4) / DECK_SIZE;
  const pLowerOrEqual = (value * 4) / DECK_SIZE;
  return { higherOrEqual: makeEntry(pHigherOrEqual, true), lowerOrEqual: makeEntry(pLowerOrEqual, true), higher: null, lower: null, equal: null };
}

function getMultipliers(value: number): HiloMultipliers {
  const DECK_SIZE = 52;

  if (value === 1) {
    // As: can only go higher (strictly) or equal — lower is impossible
    return {
      higherOrEqual: null,
      lowerOrEqual: null,
      higher: makeEntry(48 / DECK_SIZE),
      lower: null,
      equal: makeEntry(4 / DECK_SIZE),
    };
  }

  if (value === 13) {
    // Roi: can only go lower (strictly) or equal — higher is impossible
    return {
      higherOrEqual: null,
      lowerOrEqual: null,
      higher: null,
      lower: makeEntry(48 / DECK_SIZE),
      equal: makeEntry(4 / DECK_SIZE),
    };
  }

  // Normal cards (2–12): inclusive bets, no separate equal button
  const pHigherOrEqual = ((13 - value + 1) * 4) / DECK_SIZE;
  const pLowerOrEqual = (value * 4) / DECK_SIZE;
  return {
    higherOrEqual: makeEntry(pHigherOrEqual),
    lowerOrEqual: makeEntry(pLowerOrEqual),
    higher: null,
    lower: null,
    equal: null,
  };
}

function isSessionExpired(session: HiloSession): boolean {
  return Date.now() - session.lastActivityAt.getTime() > SESSION_TIMEOUT_MS;
}

function getActiveSession(userId: string): HiloSession {
  const session = activeSessions.get(userId);
  if (!session) {
    throw new AppError("Aucune partie en cours.", 404);
  }
  if (isSessionExpired(session)) {
    activeSessions.delete(userId);
    throw new AppError("La session a expiré. Lancez une nouvelle partie.", 404);
  }
  return session;
}

class HiloService {
  async startSession(userId: string, betAmount: number): Promise<HiloStartResult> {
    const existing = activeSessions.get(userId);
    if (existing && !isSessionExpired(existing)) {
      throw new AppError("Une partie est déjà en cours.", 409);
    }
    activeSessions.delete(userId);

    if (!Number.isInteger(betAmount) || betAmount < MIN_BET) {
      throw new AppError(`La mise minimum est de ${MIN_BET} tokens.`, 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("Utilisateur introuvable.", 404);
    if (user.balance < betAmount) throw new AppError("Solde insuffisant.", 400);

    // Robin de Vegas check
    const robinEvent = await robinHoodService.getActiveEvent();
    if (robinEvent) {
      const isVictim = await prisma.robinHoodVictim.findFirst({ where: { eventId: robinEvent.id, userId } });
      if (isVictim) throw new AppError("Tu ne peux pas jouer pendant que tu es la victime de Robin de Vegas.", 403);
    }
    const robinEventId = robinEvent?.id ?? null;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: betAmount } },
    });

    await jackpotService.recordCasinoContribution(userId, betAmount, "hilo");

    const currentCard = drawRandomCard();
    const session: HiloSession = {
      userId,
      initialBet: betAmount,
      currentCard,
      accumulatedMultiplier: 1.0,
      roundsPlayed: 0,
      cardHistory: [{ card: currentCard, multiplierAfter: 1.0 }],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      robinEventId,
    };
    activeSessions.set(userId, session);

    const multFn = robinEventId ? getMultipliersFair : getMultipliers;
    return {
      currentCard,
      multipliers: multFn(currentCard.value),
      balance: updated.balance,
    };
  }

  async predict(userId: string, prediction: "higher" | "lower" | "equal"): Promise<HiloPredictResult> {
    const session = getActiveSession(userId);
    const currentValue = session.currentCard.value;
    const newCard = drawRandomCard();
    const newValue = newCard.value;

    const multFn = session.robinEventId ? getMultipliersFair : getMultipliers;
    const mults = multFn(currentValue);

    let correct: boolean;
    let multiplierGained: number;

    if (prediction === "equal") {
      correct = newValue === currentValue;
      multiplierGained = mults.equal!.multiplier;
    } else if (prediction === "higher") {
      if (currentValue === 1) {
        // As: strictly higher
        correct = newValue > currentValue;
        multiplierGained = mults.higher!.multiplier;
      } else {
        // Normal: higher or equal
        correct = newValue >= currentValue;
        multiplierGained = mults.higherOrEqual!.multiplier;
      }
    } else {
      if (currentValue === 13) {
        // Roi: strictly lower
        correct = newValue < currentValue;
        multiplierGained = mults.lower!.multiplier;
      } else {
        // Normal: lower or equal
        correct = newValue <= currentValue;
        multiplierGained = mults.lowerOrEqual!.multiplier;
      }
    }

    session.lastActivityAt = new Date();

    if (!correct) {
      // Loss
      activeSessions.delete(userId);
      const lossGameData: Prisma.InputJsonValue = {
        rounds: session.roundsPlayed,
        finalMultiplier: session.accumulatedMultiplier,
        cardHistory: session.cardHistory as unknown as Prisma.InputJsonValue,
        finalCard: newCard as unknown as Prisma.InputJsonValue,
      };
      await prisma.casinoGame.create({
        data: {
          userId,
          gameType: "hilo",
          betAmount: session.initialBet,
          result: "loss",
          payout: 0,
          gameData: lossGameData,
        },
      });
      await gamificationService.synchronizeUserBadges(userId);
      await gamificationService.triggerLeaderboardTop3(userId);
      if (session.robinEventId) {
        await robinHoodService.addToPool(session.robinEventId, session.initialBet);
      }

      return {
        correct: false,
        newCard,
        newMultiplier: session.accumulatedMultiplier,
        multipliers: multFn(newValue),
        gameOver: true,
        payout: 0,
        balance: (await prisma.user.findUnique({ where: { id: userId } }))!.balance,
      };
    }

    // Correct prediction
    session.accumulatedMultiplier = Math.round(session.accumulatedMultiplier * multiplierGained * 100) / 100;
    session.roundsPlayed++;
    session.currentCard = newCard;
    session.cardHistory.push({ card: newCard, multiplierAfter: session.accumulatedMultiplier });

    return {
      correct: true,
      newCard,
      newMultiplier: session.accumulatedMultiplier,
      multipliers: multFn(newValue),
      gameOver: false,
    };
  }

  skip(userId: string): HiloSkipResult {
    const session = getActiveSession(userId);
    const newCard = drawRandomCard();
    session.currentCard = newCard;
    session.lastActivityAt = new Date();
    session.cardHistory.push({ card: newCard, multiplierAfter: session.accumulatedMultiplier });
    return {
      newCard,
      multipliers: getMultipliers(newCard.value),
    };
  }

  async cashOut(userId: string): Promise<HiloCashOutResult> {
    const session = getActiveSession(userId);

    if (session.roundsPlayed === 0) {
      throw new AppError("Aucune prédiction effectuée.", 400);
    }

    const payout = Math.floor(session.initialBet * session.accumulatedMultiplier);
    activeSessions.delete(userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: payout } },
    });

    const winGameData: Prisma.InputJsonValue = {
      rounds: session.roundsPlayed,
      finalMultiplier: session.accumulatedMultiplier,
      cardHistory: session.cardHistory as unknown as Prisma.InputJsonValue,
    };
    await prisma.casinoGame.create({
      data: {
        userId,
        gameType: "hilo",
        betAmount: session.initialBet,
        result: "win",
        payout: payout - session.initialBet,
        gameData: winGameData,
      },
    });

    await gamificationService.synchronizeUserBadges(userId);
    await gamificationService.triggerLeaderboardTop3(userId);
    if (session.robinEventId && payout > session.initialBet) {
      await robinHoodService.deductFromPool(session.robinEventId, payout - session.initialBet);
    }

    return {
      payout,
      multiplier: session.accumulatedMultiplier,
      balance: updated.balance,
    };
  }

  getCurrent(userId: string): HiloCurrentResult {
    const session = getActiveSession(userId);
    const potentialPayout = Math.floor(session.initialBet * session.accumulatedMultiplier);
    return {
      currentCard: session.currentCard,
      multipliers: getMultipliers(session.currentCard.value),
      accumulatedMultiplier: session.accumulatedMultiplier,
      roundsPlayed: session.roundsPlayed,
      initialBet: session.initialBet,
      potentialPayout,
    };
  }
}

export const hiloService = new HiloService();
