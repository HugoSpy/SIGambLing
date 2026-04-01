import type {
  BetChipPosition,
  BetType,
  RouletteBet,
  RouletteNumber,
  RouletteResult,
} from "../../types/roulette";
import {
  ALL_NUMBERS,
  BET_MULTIPLIERS,
  BLACK_NUMBERS,
  NUMBER_COLORS,
  RED_NUMBERS,
} from "./rouletteConstants";

function isStraightBetType(betType: BetType): betType is `number_${RouletteNumber}` {
  return betType.startsWith("number_");
}

export function isBetWinning(betType: BetType, result: RouletteNumber): boolean {
  if (betType === "red") {
    return RED_NUMBERS.includes(result);
  }

  if (betType === "black") {
    return BLACK_NUMBERS.includes(result);
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

  if (isStraightBetType(betType)) {
    return result === Number(betType.split("_")[1]);
  }

  return false;
}

export function getMultiplier(betType: BetType) {
  if (isStraightBetType(betType)) {
    return BET_MULTIPLIERS.number;
  }

  return BET_MULTIPLIERS[betType];
}

export function calculatePayout(bet: RouletteBet, result: RouletteNumber) {
  if (!isBetWinning(bet.type, result)) {
    return 0;
  }

  return bet.amount * bet.multiplier;
}

export function createBet(type: BetType, amount: number, position?: BetChipPosition): RouletteBet {
  const multiplier = getMultiplier(type);

  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    amount,
    position,
    multiplier,
    potentialWin: amount * multiplier,
  };
}

export function resolveRound(bets: RouletteBet[], result: RouletteNumber): RouletteResult {
  const winningBets = bets.filter((bet) => isBetWinning(bet.type, result));
  const totalPayout = winningBets.reduce(
    (sum, bet) => sum + calculatePayout(bet, result),
    0,
  );

  return {
    number: result,
    color: NUMBER_COLORS[result],
    winningBets,
    totalPayout,
    timestamp: new Date().toISOString(),
  };
}

export function aggregateBetsByType(bets: RouletteBet[]) {
  return bets.reduce<Record<string, number>>((accumulator, bet) => {
    accumulator[bet.type] = (accumulator[bet.type] ?? 0) + bet.amount;
    return accumulator;
  }, {});
}

export function getHotColdNumbers(history: RouletteResult[], sampleSize = 120) {
  const counts = new Map<RouletteNumber, number>();

  for (const number of ALL_NUMBERS) {
    counts.set(number, 0);
  }

  history.slice(0, sampleSize).forEach((entry) => {
    counts.set(entry.number, (counts.get(entry.number) ?? 0) + 1);
  });

  const sorted = [...counts.entries()].sort((left, right) => right[1] - left[1]);

  return {
    hot: sorted.slice(0, 5).map(([number, count]) => ({ number, count })),
    cold: [...sorted].reverse().slice(0, 5).map(([number, count]) => ({ number, count })),
  };
}

export function getBetLabel(type: BetType) {
  if (isStraightBetType(type)) {
    return type.replace("number_", "");
  }

  return type;
}
