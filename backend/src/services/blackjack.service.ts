import type { Prisma } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { gamificationService } from "./gamification.service";
import { jackpotService } from "./jackpot.service";
import { prisma } from "./prisma.service";

type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface BlackjackCard {
  rank: Rank;
  suit: Suit;
}

interface ActiveGame {
  userId: string;
  initialBet: number;
  bet: number;
  deck: BlackjackCard[];
  playerHand: BlackjackCard[];
  dealerHand: BlackjackCard[];
  doubled: boolean;
  insuranceBet: number;
  insuranceResolved: boolean;
  insuranceAvailable: boolean;
  dealerHasBlackjack: boolean;
}

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const activeSessions = new Map<string, ActiveGame>();
const userGameMap = new Map<string, string>();
let deckFactory = () => buildDeck(6);

function buildDeck(numDecks = 6): BlackjackCard[] {
  const deck: BlackjackCard[] = [];
  for (let d = 0; d < numDecks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ rank, suit });
      }
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

function handTotal(cards: BlackjackCard[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }
  for (let i = 0; i < aces; i++) {
    if (total + 11 <= 21) {
      total += 11;
    } else {
      total += 1;
    }
  }
  return total;
}

function generateGameId(): string {
  return `bj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function canOfferInsurance(game: ActiveGame): boolean {
  return (
    game.insuranceAvailable &&
    !game.insuranceResolved &&
    game.insuranceBet === 0 &&
    game.playerHand.length === 2 &&
    game.dealerHand[0]?.rank === "A"
  );
}

class BlackjackService {
  private getActiveGame(userId: string, gameId: string): ActiveGame {
    const game = activeSessions.get(gameId);
    if (!game || game.userId !== userId) {
      throw new AppError("Partie introuvable ou accès non autorisé.", 404);
    }
    return game;
  }

  private cleanupGame(gameId: string, userId: string) {
    activeSessions.delete(gameId);
    userGameMap.delete(userId);
  }

  private async saveGame(
    userId: string,
    game: ActiveGame,
    result: "win" | "loss" | "push",
    payout: number,
    extraData: Record<string, unknown>,
  ) {
    const totalStake = game.bet + game.insuranceBet;
    const gameData: Prisma.InputJsonValue = {
      player_hand: game.playerHand as unknown as Prisma.InputJsonValue,
      dealer_hand: game.dealerHand as unknown as Prisma.InputJsonValue,
      initial_bet: game.initialBet,
      total_stake: totalStake,
      doubled: game.doubled,
      insurance_bet: game.insuranceBet,
      insurance_resolved: game.insuranceResolved,
      dealer_blackjack: game.dealerHasBlackjack,
      ...extraData,
    };
    await prisma.casinoGame.create({
      data: {
        userId,
        gameType: "blackjack",
        betAmount: totalStake,
        result,
        payout: payout - totalStake,
        gameData,
      },
    });

    await gamificationService.synchronizeUserBadges(userId);
  }

  private async settleDealerBlackjack(userId: string, gameId: string, game: ActiveGame) {
    const playerTotal = handTotal(game.playerHand);
    const dealerTotal = handTotal(game.dealerHand);
    const playerBlackjack = playerTotal === 21 && game.playerHand.length === 2;
    const insuranceWon = game.insuranceBet > 0;
    const insurancePayout = insuranceWon ? game.insuranceBet * 3 : 0;

    let result: "win" | "loss" | "push";
    let resolvedResult: string;
    let payout: number;

    if (playerBlackjack) {
      result = "push";
      resolvedResult = "push";
      payout = game.initialBet + insurancePayout;
    } else {
      result = "loss";
      resolvedResult = "loss";
      payout = insurancePayout;
    }

    this.cleanupGame(gameId, userId);

    if (payout > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: payout } },
      });
    }

    await this.saveGame(userId, game, result, payout, {
      player_total: playerTotal,
      dealer_total: dealerTotal,
      result: resolvedResult,
      payout,
      player_blackjack: playerBlackjack,
      dealer_blackjack: true,
      insurance_payout: insurancePayout,
      insurance_won: insuranceWon,
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    return {
      player_hand: game.playerHand,
      player_total: playerTotal,
      dealer_hand_final: game.dealerHand,
      dealer_total: dealerTotal,
      status: "resolved" as const,
      result: resolvedResult,
      payout,
      insurance_bet: game.insuranceBet,
      insurance_payout: insurancePayout,
      insurance_available: false,
      new_balance: updatedUser?.balance ?? 0,
    };
  }

  private async resolvePendingDealerPeek(userId: string, gameId: string, game: ActiveGame) {
    if (!game.insuranceAvailable) {
      return null;
    }

    game.insuranceAvailable = false;

    if (game.dealerHasBlackjack) {
      return this.settleDealerBlackjack(userId, gameId, game);
    }

    return null;
  }

  private async dealerPlay(userId: string, gameId: string, game: ActiveGame) {
    game.insuranceAvailable = false;

    while (handTotal(game.dealerHand) < 17) {
      const card = game.deck.pop();
      if (!card) break;
      game.dealerHand.push(card);
    }

    const playerTotal = handTotal(game.playerHand);
    const dealerTotal = handTotal(game.dealerHand);
    const dealerBusted = dealerTotal > 21;

    let result: "win" | "loss" | "push";
    let resolvedResult: string;
    let payout: number;

    if (dealerBusted || playerTotal > dealerTotal) {
      result = "win";
      resolvedResult = "win";
      payout = game.bet * 2;
    } else if (playerTotal === dealerTotal) {
      result = "push";
      resolvedResult = "push";
      payout = game.bet;
    } else {
      result = "loss";
      resolvedResult = "loss";
      payout = 0;
    }

    this.cleanupGame(gameId, userId);

    if (payout > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: payout } },
      });
    }

    await this.saveGame(userId, game, result, payout, {
      player_total: playerTotal,
      dealer_total: dealerTotal,
      result: resolvedResult,
      payout,
      dealer_busted: dealerBusted,
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    return {
      player_hand: game.playerHand,
      player_total: playerTotal,
      dealer_hand_final: game.dealerHand,
      dealer_total: dealerTotal,
      status: "resolved" as const,
      result: resolvedResult,
      payout,
      insurance_bet: game.insuranceBet,
      insurance_payout: 0,
      insurance_available: false,
      new_balance: updatedUser?.balance ?? 0,
    };
  }

  async deal(userId: string, bet: number) {
    const existingGameId = userGameMap.get(userId);
    if (existingGameId && activeSessions.has(existingGameId)) {
      throw new AppError("Vous avez déjà une partie en cours.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, isBanned: true },
    });
    if (!user || user.isBanned) throw new AppError("Utilisateur introuvable ou banni.", 404);
    if (user.balance < bet) throw new AppError("Balance insuffisante.", 400);

    const gameId = generateGameId();
    await prisma.$transaction(async (transaction) => {
      const debited = await transaction.user.updateMany({
        where: { id: userId, isBanned: false, balance: { gte: bet } },
        data: { balance: { decrement: bet } },
      });

      if (debited.count !== 1) {
        throw new AppError("Balance insuffisante.", 400);
      }

      await jackpotService.recordCasinoContribution(userId, bet, "blackjack", gameId, transaction);
    });

    const newBalance = user.balance - bet;
    const deck = deckFactory();
    const playerHand: BlackjackCard[] = [deck.pop()!, deck.pop()!];
    const dealerHand: BlackjackCard[] = [deck.pop()!, deck.pop()!];

    const playerBlackjack = handTotal(playerHand) === 21;
    const dealerBlackjack = handTotal(dealerHand) === 21;
    const insuranceAvailable = dealerHand[0]?.rank === "A" && !playerBlackjack;

    activeSessions.set(gameId, {
      userId,
      initialBet: bet,
      bet,
      deck,
      playerHand,
      dealerHand,
      doubled: false,
      insuranceBet: 0,
      insuranceResolved: false,
      insuranceAvailable,
      dealerHasBlackjack: dealerBlackjack,
    });
    userGameMap.set(userId, gameId);

    const playerTotal = handTotal(playerHand);
    const dealerTotal = handTotal(dealerHand);

    if (playerBlackjack || (dealerBlackjack && !insuranceAvailable)) {
      this.cleanupGame(gameId, userId);

      let result: "win" | "loss" | "push";
      let resolvedResult: string;
      let payout: number;

      if (playerBlackjack && dealerBlackjack) {
        result = "push";
        resolvedResult = "push";
        payout = bet;
      } else if (playerBlackjack) {
        result = "win";
        resolvedResult = "blackjack";
        payout = Math.floor(bet * 2.5);
      } else {
        result = "loss";
        resolvedResult = "loss";
        payout = 0;
      }

      if (payout > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: payout } },
        });
      }

      const gameData: Prisma.InputJsonValue = {
        player_hand: playerHand as unknown as Prisma.InputJsonValue,
        dealer_hand: dealerHand as unknown as Prisma.InputJsonValue,
        player_total: playerTotal,
        dealer_total: dealerTotal,
        result: resolvedResult,
        payout,
        player_blackjack: playerBlackjack,
        dealer_blackjack: dealerBlackjack,
      };
      await prisma.casinoGame.create({
        data: {
          userId,
          gameType: "blackjack",
          betAmount: bet,
          result,
          payout: payout - bet,
          gameData,
        },
      });

      await gamificationService.synchronizeUserBadges(userId);

      return {
        game_id: gameId,
        player_hand: playerHand,
        dealer_hand_final: dealerHand,
        dealer_upcard: dealerHand[0]!,
        player_total: playerTotal,
        dealer_total: dealerTotal,
        status: "resolved" as const,
        result: resolvedResult,
        payout,
        insurance_bet: 0,
        insurance_payout: 0,
        insurance_available: false,
        new_balance: newBalance + payout,
        is_immediate: true,
      };
    }

    return {
      game_id: gameId,
      player_hand: playerHand,
      dealer_upcard: dealerHand[0]!,
      dealer_visible_total: handTotal([dealerHand[0]!]),
      player_total: playerTotal,
      status: "playing" as const,
      insurance_bet: 0,
      insurance_available: insuranceAvailable,
      new_balance: newBalance,
    };
  }

  async hit(userId: string, gameId: string) {
    const game = this.getActiveGame(userId, gameId);
    const dealerPeekResult = await this.resolvePendingDealerPeek(userId, gameId, game);
    if (dealerPeekResult) {
      return dealerPeekResult;
    }

    const card = game.deck.pop();
    if (!card) throw new AppError("Le deck est vide.", 500);
    game.playerHand.push(card);

    const playerTotal = handTotal(game.playerHand);

    if (playerTotal > 21) {
      this.cleanupGame(gameId, userId);

      await this.saveGame(userId, game, "loss", 0, {
        player_total: playerTotal,
        dealer_total: handTotal(game.dealerHand),
        result: "bust",
        payout: 0,
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      return {
        player_hand: game.playerHand,
        player_total: playerTotal,
        dealer_hand_final: game.dealerHand,
        dealer_total: handTotal(game.dealerHand),
        status: "resolved" as const,
        result: "bust",
        payout: 0,
        insurance_bet: game.insuranceBet,
        insurance_payout: 0,
        insurance_available: false,
        new_balance: updatedUser?.balance ?? 0,
      };
    }

    if (playerTotal === 21) {
      return this.dealerPlay(userId, gameId, game);
    }

    return {
      player_hand: game.playerHand,
      player_total: playerTotal,
      status: "playing" as const,
      insurance_bet: game.insuranceBet,
      insurance_available: false,
    };
  }

  async stand(userId: string, gameId: string) {
    const game = this.getActiveGame(userId, gameId);
    const dealerPeekResult = await this.resolvePendingDealerPeek(userId, gameId, game);
    if (dealerPeekResult) {
      return dealerPeekResult;
    }
    return this.dealerPlay(userId, gameId, game);
  }

  async double(userId: string, gameId: string) {
    const game = this.getActiveGame(userId, gameId);
    const dealerPeekResult = await this.resolvePendingDealerPeek(userId, gameId, game);
    if (dealerPeekResult) {
      return dealerPeekResult;
    }

    if (game.playerHand.length !== 2) {
      throw new AppError("Le double down n'est disponible qu'avec 2 cartes.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    if (!user || user.balance < game.bet) {
      throw new AppError("Balance insuffisante pour doubler.", 400);
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const debited = await transaction.user.updateMany({
        where: { id: userId, balance: { gte: game.bet } },
        data: { balance: { decrement: game.bet } },
      });

      if (debited.count !== 1) {
        throw new AppError("Balance insuffisante pour doubler.", 400);
      }

      await jackpotService.recordCasinoContribution(userId, game.bet, "blackjack", gameId, transaction);
      return debited;
    });
    if (updated.count !== 1) throw new AppError("Balance insuffisante pour doubler.", 400);

    game.bet *= 2;
    game.doubled = true;
    game.insuranceAvailable = false;

    const card = game.deck.pop();
    if (!card) throw new AppError("Le deck est vide.", 500);
    game.playerHand.push(card);

    return this.dealerPlay(userId, gameId, game);
  }

  async insure(userId: string, gameId: string) {
    const game = this.getActiveGame(userId, gameId);

    if (!canOfferInsurance(game)) {
      throw new AppError("L'assurance n'est pas disponible pour cette manche.", 400);
    }

    const insuranceBet = Math.floor(game.initialBet / 2);
    if (insuranceBet < 1) {
      throw new AppError("Mise trop faible pour prendre une assurance.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    if (!user || user.balance < insuranceBet) {
      throw new AppError("Balance insuffisante pour l'assurance.", 400);
    }

    const debited = await prisma.user.updateMany({
      where: { id: userId, balance: { gte: insuranceBet } },
      data: { balance: { decrement: insuranceBet } },
    });

    if (debited.count !== 1) {
      throw new AppError("Balance insuffisante pour l'assurance.", 400);
    }

    game.insuranceBet = insuranceBet;
    game.insuranceResolved = true;
    game.insuranceAvailable = false;

    if (game.dealerHasBlackjack) {
      return this.settleDealerBlackjack(userId, gameId, game);
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    return {
      player_hand: game.playerHand,
      player_total: handTotal(game.playerHand),
      status: "playing" as const,
      insurance_bet: insuranceBet,
      insurance_payout: 0,
      insurance_available: false,
      new_balance: updatedUser?.balance ?? Math.max(0, user.balance - insuranceBet),
    };
  }
}

export const blackjackService = new BlackjackService();
export const blackjackServiceTestUtils = {
  setDeckFactory(factory: () => BlackjackCard[]) {
    deckFactory = factory;
  },
  resetDeckFactory() {
    deckFactory = () => buildDeck(6);
  },
  clearSessions() {
    activeSessions.clear();
    userGameMap.clear();
  },
};
