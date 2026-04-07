import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";

type WinSort = "recent" | "best_gain" | "biggest_bet";

interface WinEntry {
  id: string;
  type: "bet" | "casino";
  source: string;
  amount: number;
  payout: number;
  profit: number;
  date: string;
  detail: string;
}

interface WinsResult {
  wins: WinEntry[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatRouletteDetail(gameData: unknown): string {
  if (typeof gameData !== "object" || gameData === null) return "Roulette";
  const data = gameData as Record<string, unknown>;
  if (Array.isArray(data.chosenBets) && data.chosenBets.length > 0) {
    return data.chosenBets
      .map((b: unknown) => {
        if (typeof b === "object" && b !== null && "type" in b) {
          return String((b as { type: string }).type);
        }
        return String(b);
      })
      .join(" • ");
  }
  if (typeof data.betType === "string") return data.betType;
  return "Roulette";
}

function mapBetToWin(
  bet: {
    id: string;
    amount: number;
    payout: number;
    resolvedAt: Date | null;
    createdAt: Date;
    chosenOption: string | null;
    event: { title: string } | null;
  },
): WinEntry {
  const eventTitle = bet.event?.title ? truncate(bet.event.title, 40) : "Événement";
  return {
    id: bet.id,
    type: "bet",
    source: "Paris sportifs",
    amount: bet.amount,
    payout: bet.payout,
    profit: bet.payout - bet.amount,
    date: (bet.resolvedAt ?? bet.createdAt).toISOString(),
    detail: `${bet.chosenOption ?? "?"} — ${eventTitle}`,
  };
}

function mapCasinoToWin(
  game: {
    id: string;
    betAmount: number;
    payout: number;
    createdAt: Date;
    gameType: string;
    gameData: unknown;
  },
): WinEntry {
  const isRoulette = game.gameType === "roulette";
  return {
    id: game.id,
    type: "casino",
    source: isRoulette ? "Roulette" : "Blackjack",
    amount: game.betAmount,
    payout: game.payout,
    profit: game.payout - game.betAmount,
    date: game.createdAt.toISOString(),
    detail: isRoulette ? formatRouletteDetail(game.gameData) : "Blackjack",
  };
}

function sortWins(wins: WinEntry[], sort: WinSort): WinEntry[] {
  switch (sort) {
    case "recent":
      return wins.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    case "best_gain":
      return wins.sort((a, b) => b.profit - a.profit);
    case "biggest_bet":
      return wins.sort((a, b) => b.amount - a.amount);
  }
}

export async function getUserWins(
  userId: string,
  sort: WinSort = "recent",
  limit: number = 20,
  offset: number = 0,
): Promise<WinsResult> {
  if (offset >= 100) {
    throw new AppError("Limite de 100 victoires atteinte.", 400);
  }

  const effectiveLimit = Math.min(limit, 20);

  const [bets, casinoGames] = await Promise.all([
    prisma.bet.findMany({
      where: { userId, status: "won" },
      select: {
        id: true,
        amount: true,
        payout: true,
        resolvedAt: true,
        createdAt: true,
        chosenOption: true,
        event: { select: { title: true } },
      },
    }),
    prisma.casinoGame.findMany({
      where: { userId, result: "win" },
      select: {
        id: true,
        betAmount: true,
        payout: true,
        createdAt: true,
        gameType: true,
        gameData: true,
      },
    }),
  ]);

  const allWins: WinEntry[] = [
    ...bets.map(mapBetToWin),
    ...casinoGames.map(mapCasinoToWin),
  ];

  sortWins(allWins, sort);

  const total = allWins.length;
  const page = allWins.slice(offset, offset + effectiveLimit);
  const nextOffset = offset + effectiveLimit;

  return {
    wins: page,
    total,
    hasMore: nextOffset < total && nextOffset < 100,
    nextOffset,
  };
}

export async function getWinForShare(
  userId: string,
  winId: string,
  winType: "bet" | "casino",
): Promise<{ amount: number; profit: number; source: string; eventTitle?: string }> {
  if (winType === "bet") {
    const bet = await prisma.bet.findUnique({
      where: { id: winId },
      select: {
        userId: true,
        amount: true,
        payout: true,
        status: true,
        event: { select: { title: true } },
      },
    });

    if (!bet || bet.userId !== userId) {
      throw new AppError("Victoire introuvable.", 404);
    }
    if (bet.status !== "won") {
      throw new AppError("Ce pari n'est pas une victoire.", 400);
    }

    return {
      amount: bet.amount,
      profit: bet.payout - bet.amount,
      source: "bet",
      eventTitle: bet.event?.title ?? "un événement",
    };
  }

  const game = await prisma.casinoGame.findUnique({
    where: { id: winId },
    select: {
      userId: true,
      betAmount: true,
      payout: true,
      result: true,
      gameType: true,
    },
  });

  if (!game || game.userId !== userId) {
    throw new AppError("Victoire introuvable.", 404);
  }
  if (game.result !== "win") {
    throw new AppError("Cette partie n'est pas une victoire.", 400);
  }

  return {
    amount: game.betAmount,
    profit: game.payout - game.betAmount,
    source: game.gameType,
  };
}
