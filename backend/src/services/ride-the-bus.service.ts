import type { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { gamificationService } from "./gamification.service";
import { jackpotService } from "./jackpot.service";
import { prisma } from "./prisma.service";

type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type Color = "red" | "black";

export interface RidetheBusCard {
  value: number; // 1=As, 2-10, 11=J, 12=Q, 13=K
  suit: Suit;
  color: Color;
}

export interface Step2Multipliers {
  higher: number;
  lower: number;
  higherProb: number;
  lowerProb: number;
}

export interface Step3Multipliers {
  inside: number;
  outside: number;
  insideProb: number;
  outsideProb: number;
}

export interface RidetheBusStartResult {
  step: 1;
  cards: RidetheBusCard[];
  currentMultiplier: number;
  step1Multiplier: number;
  betAmount: number;
  balance: number;
}

export interface RidetheBusAnswerResult {
  correct: boolean;
  revealedCard: RidetheBusCard;
  tiedCards: RidetheBusCard[];
  stepSkipped: boolean;
  nextStep: 2 | 3 | 4 | null;
  currentMultiplier: number;
  step2Multipliers?: Step2Multipliers;
  step3Multipliers?: Step3Multipliers;
  potentialWin: number;
  gameState: "active" | "won" | "lost";
  payout?: number;
  balance?: number;
}

export interface RidetheBusCurrentResult {
  step: 1 | 2 | 3 | 4;
  cards: RidetheBusCard[];
  currentMultiplier: number;
  betAmount: number;
  potentialWin: number;
  step1Multiplier: number;
  step2Multipliers?: Step2Multipliers;
  step3Multipliers?: Step3Multipliers;
}

interface RidetheBusSession {
  userId: string;
  betAmount: number;
  currentStep: 1 | 2 | 3 | 4;
  cards: RidetheBusCard[];
  deck: RidetheBusCard[];
  currentMultiplier: number;
  startedAt: Date;
  lastActivityAt: Date;
}

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RED_SUITS = new Set<Suit>(["hearts", "diamonds"]);
const STEP1_MULTIPLIER = 1.95;
const STEP4_MULTIPLIER = 4;
const MIN_BET = 10;
const MAX_TIE_ATTEMPTS = 3;

const activeSessions = new Map<string, RidetheBusSession>();

function createDeck(): RidetheBusCard[] {
  const deck: RidetheBusCard[] = [];
  for (const suit of SUITS) {
    for (let v = 1; v <= 13; v++) {
      deck.push({ value: v, suit, color: RED_SUITS.has(suit) ? "red" : "black" });
    }
  }
  return deck;
}

function shuffle(arr: RidetheBusCard[]): RidetheBusCard[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function drawTop(deck: RidetheBusCard[]): RidetheBusCard {
  const card = deck.shift();
  if (!card) throw new AppError("Deck épuisé.", 500);
  return card;
}

function safeMultiplier(prob: number): number {
  if (prob <= 0) return 50;
  return Math.max(1.05, Math.round((1 / prob) * 0.95 * 100) / 100);
}

function calcStep2Multipliers(deck: RidetheBusCard[], card1Value: number): Step2Multipliers {
  const total = deck.length;
  const higherCount = deck.filter((c) => c.value > card1Value).length;
  const lowerCount = deck.filter((c) => c.value < card1Value).length;
  return {
    higher: safeMultiplier(higherCount / total),
    lower: safeMultiplier(lowerCount / total),
    higherProb: higherCount / total,
    lowerProb: lowerCount / total,
  };
}

function calcStep3Multipliers(
  deck: RidetheBusCard[],
  card1Value: number,
  card2Value: number,
): Step3Multipliers {
  const minVal = Math.min(card1Value, card2Value);
  const maxVal = Math.max(card1Value, card2Value);
  const total = deck.length;
  const insideCount = deck.filter((c) => c.value >= minVal && c.value <= maxVal).length;
  const outsideCount = total - insideCount;
  return {
    inside: safeMultiplier(insideCount / total),
    outside: safeMultiplier(outsideCount / total),
    insideProb: insideCount / total,
    outsideProb: outsideCount / total,
  };
}

class RidetheBusService {
  async start(userId: string, betAmount: number): Promise<RidetheBusStartResult> {
    if (activeSessions.has(userId)) {
      throw new AppError("Une partie est déjà en cours.", 409);
    }
    if (!Number.isInteger(betAmount) || betAmount < MIN_BET) {
      throw new AppError(`La mise minimum est de ${MIN_BET} tokens.`, 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("Utilisateur introuvable.", 404);
    if (user.balance < betAmount) throw new AppError("Solde insuffisant.", 400);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: betAmount } },
    });

    await jackpotService.recordCasinoContribution(userId, betAmount, "ride_the_bus");

    const session: RidetheBusSession = {
      userId,
      betAmount,
      currentStep: 1,
      cards: [],
      deck: shuffle(createDeck()),
      currentMultiplier: 1.0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };
    activeSessions.set(userId, session);

    return {
      step: 1,
      cards: [],
      currentMultiplier: 1.0,
      step1Multiplier: STEP1_MULTIPLIER,
      betAmount,
      balance: updated.balance,
    };
  }

  async answer(userId: string, step: number, answer: string): Promise<RidetheBusAnswerResult> {
    const session = activeSessions.get(userId);
    if (!session) throw new AppError("Aucune partie en cours.", 404);
    if (session.currentStep !== step) throw new AppError("Étape incorrecte.", 400);

    session.lastActivityAt = new Date();

    if (step === 1) return this.handleStep1(userId, session, answer as "red" | "black");
    if (step === 2) return this.handleStep2(userId, session, answer as "higher" | "lower");
    if (step === 3) return this.handleStep3(userId, session, answer as "inside" | "outside");
    if (step === 4) return this.handleStep4(userId, session, answer as Suit);
    throw new AppError("Étape invalide.", 400);
  }

  private async handleStep1(
    userId: string,
    session: RidetheBusSession,
    answer: "red" | "black",
  ): Promise<RidetheBusAnswerResult> {
    const card = drawTop(session.deck);
    session.cards.push(card);

    if (card.color !== answer) {
      activeSessions.delete(userId);
      await this.recordLoss(session);
      const { balance } = (await prisma.user.findUnique({ where: { id: userId } }))!;
      return {
        correct: false,
        revealedCard: card,
        tiedCards: [],
        stepSkipped: false,
        nextStep: null,
        currentMultiplier: 0,
        potentialWin: 0,
        gameState: "lost",
        payout: 0,
        balance,
      };
    }

    session.currentMultiplier =
      Math.round(session.currentMultiplier * STEP1_MULTIPLIER * 100) / 100;
    session.currentStep = 2;

    const s2 = calcStep2Multipliers(session.deck, card.value);
    return {
      correct: true,
      revealedCard: card,
      tiedCards: [],
      stepSkipped: false,
      nextStep: 2,
      currentMultiplier: session.currentMultiplier,
      step2Multipliers: s2,
      potentialWin: Math.floor(session.betAmount * session.currentMultiplier),
      gameState: "active",
    };
  }

  private async handleStep2(
    userId: string,
    session: RidetheBusSession,
    answer: "higher" | "lower",
  ): Promise<RidetheBusAnswerResult> {
    const card1 = session.cards[0]!;
    const mults = calcStep2Multipliers(session.deck, card1.value);
    const appliedMultiplier = answer === "higher" ? mults.higher : mults.lower;

    // Draw with tie-redraw (max MAX_TIE_ATTEMPTS attempts total)
    const tiedCards: RidetheBusCard[] = [];
    let finalCard: RidetheBusCard | null = null;
    for (let attempt = 0; attempt < MAX_TIE_ATTEMPTS; attempt++) {
      const drawn = drawTop(session.deck);
      if (drawn.value !== card1.value) {
        finalCard = drawn;
        break;
      }
      tiedCards.push(drawn);
    }

    // All attempts tied — skip step, use last tied card
    if (!finalCard) {
      finalCard = tiedCards[tiedCards.length - 1]!;
      session.cards.push(finalCard);
      session.currentStep = 3;
      const s3 = calcStep3Multipliers(session.deck, card1.value, finalCard.value);
      return {
        correct: true,
        revealedCard: finalCard,
        tiedCards,
        stepSkipped: true,
        nextStep: 3,
        currentMultiplier: session.currentMultiplier,
        step3Multipliers: s3,
        potentialWin: Math.floor(session.betAmount * session.currentMultiplier),
        gameState: "active",
      };
    }

    session.cards.push(finalCard);

    const correct =
      answer === "higher" ? finalCard.value > card1.value : finalCard.value < card1.value;

    if (!correct) {
      activeSessions.delete(userId);
      await this.recordLoss(session);
      const { balance } = (await prisma.user.findUnique({ where: { id: userId } }))!;
      return {
        correct: false,
        revealedCard: finalCard,
        tiedCards,
        stepSkipped: false,
        nextStep: null,
        currentMultiplier: 0,
        potentialWin: 0,
        gameState: "lost",
        payout: 0,
        balance,
      };
    }

    session.currentMultiplier =
      Math.round(session.currentMultiplier * appliedMultiplier * 100) / 100;
    session.currentStep = 3;

    const s3 = calcStep3Multipliers(session.deck, card1.value, finalCard.value);
    return {
      correct: true,
      revealedCard: finalCard,
      tiedCards,
      stepSkipped: false,
      nextStep: 3,
      currentMultiplier: session.currentMultiplier,
      step3Multipliers: s3,
      potentialWin: Math.floor(session.betAmount * session.currentMultiplier),
      gameState: "active",
    };
  }

  private async handleStep3(
    userId: string,
    session: RidetheBusSession,
    answer: "inside" | "outside",
  ): Promise<RidetheBusAnswerResult> {
    const card1 = session.cards[0]!;
    const card2 = session.cards[1]!;
    const mults = calcStep3Multipliers(session.deck, card1.value, card2.value);
    const appliedMultiplier = answer === "inside" ? mults.inside : mults.outside;

    const card = drawTop(session.deck);
    session.cards.push(card);

    const minVal = Math.min(card1.value, card2.value);
    const maxVal = Math.max(card1.value, card2.value);
    const isInside = card.value >= minVal && card.value <= maxVal;
    const correct = answer === "inside" ? isInside : !isInside;

    if (!correct) {
      activeSessions.delete(userId);
      await this.recordLoss(session);
      const { balance } = (await prisma.user.findUnique({ where: { id: userId } }))!;
      return {
        correct: false,
        revealedCard: card,
        tiedCards: [],
        stepSkipped: false,
        nextStep: null,
        currentMultiplier: 0,
        potentialWin: 0,
        gameState: "lost",
        payout: 0,
        balance,
      };
    }

    session.currentMultiplier =
      Math.round(session.currentMultiplier * appliedMultiplier * 100) / 100;
    session.currentStep = 4;

    return {
      correct: true,
      revealedCard: card,
      tiedCards: [],
      stepSkipped: false,
      nextStep: 4,
      currentMultiplier: session.currentMultiplier,
      potentialWin: Math.floor(session.betAmount * session.currentMultiplier),
      gameState: "active",
    };
  }

  private async handleStep4(
    userId: string,
    session: RidetheBusSession,
    answer: Suit,
  ): Promise<RidetheBusAnswerResult> {
    const card = drawTop(session.deck);
    session.cards.push(card);
    activeSessions.delete(userId);

    if (card.suit !== answer) {
      await this.recordLoss(session);
      const { balance } = (await prisma.user.findUnique({ where: { id: userId } }))!;
      return {
        correct: false,
        revealedCard: card,
        tiedCards: [],
        stepSkipped: false,
        nextStep: null,
        currentMultiplier: 0,
        potentialWin: 0,
        gameState: "lost",
        payout: 0,
        balance,
      };
    }

    const finalMultiplier =
      Math.round(session.currentMultiplier * STEP4_MULTIPLIER * 100) / 100;
    const payout = Math.floor(session.betAmount * finalMultiplier);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: payout } },
    });

    const gameData: Prisma.InputJsonValue = {
      cards: session.cards as unknown as Prisma.InputJsonValue,
      finalMultiplier,
    };
    await prisma.casinoGame.create({
      data: {
        userId,
        gameType: "ride_the_bus",
        betAmount: session.betAmount,
        result: "win",
        payout: payout - session.betAmount,
        gameData,
      },
    });

    await gamificationService.synchronizeUserBadges(userId);
    await gamificationService.triggerLeaderboardTop3(userId);

    return {
      correct: true,
      revealedCard: card,
      tiedCards: [],
      stepSkipped: false,
      nextStep: null,
      currentMultiplier: finalMultiplier,
      potentialWin: payout,
      gameState: "won",
      payout,
      balance: updated.balance,
    };
  }

  private async recordLoss(session: RidetheBusSession): Promise<void> {
    const gameData: Prisma.InputJsonValue = {
      cards: session.cards as unknown as Prisma.InputJsonValue,
      finalMultiplier: 0,
    };
    await prisma.casinoGame.create({
      data: {
        userId: session.userId,
        gameType: "ride_the_bus",
        betAmount: session.betAmount,
        result: "loss",
        payout: 0,
        gameData,
      },
    });
    await gamificationService.synchronizeUserBadges(session.userId);
    await gamificationService.triggerLeaderboardTop3(session.userId);
  }

  getCurrent(userId: string): RidetheBusCurrentResult {
    const session = activeSessions.get(userId);
    if (!session) throw new AppError("Aucune partie en cours.", 404);

    let step2Multipliers: Step2Multipliers | undefined;
    let step3Multipliers: Step3Multipliers | undefined;

    if (session.currentStep === 2 && session.cards[0]) {
      step2Multipliers = calcStep2Multipliers(session.deck, session.cards[0].value);
    }
    if (session.currentStep === 3 && session.cards[0] && session.cards[1]) {
      step3Multipliers = calcStep3Multipliers(
        session.deck,
        session.cards[0].value,
        session.cards[1].value,
      );
    }

    return {
      step: session.currentStep,
      cards: session.cards,
      currentMultiplier: session.currentMultiplier,
      betAmount: session.betAmount,
      potentialWin: Math.floor(session.betAmount * session.currentMultiplier),
      step1Multiplier: STEP1_MULTIPLIER,
      step2Multipliers,
      step3Multipliers,
    };
  }
}

export const ridethebusService = new RidetheBusService();
