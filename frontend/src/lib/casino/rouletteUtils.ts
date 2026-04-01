import type {
  BetType,
  CornerBetType,
  NumberBetType,
  RouletteBet,
  RouletteNumber,
  RouletteResult,
  SixlineBetType,
  SplitBetType,
  StreetBetType,
} from "../../types/roulette";
import {
  ALL_NUMBERS,
  BET_MULTIPLIERS,
  BLACK_NUMBERS,
  CORNER_STARTS,
  NUMBER_COLORS,
  RED_NUMBERS,
  SIXLINE_STARTS,
  STREET_STARTS,
} from "./rouletteConstants";

const VALID_CORNER_STARTS = new Set<number>(CORNER_STARTS);
const VALID_SIXLINE_STARTS = new Set<number>(SIXLINE_STARTS);
const VALID_STREET_STARTS = new Set<number>(STREET_STARTS);

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

function isStraightBetType(betType: string): betType is NumberBetType {
  const values = parseBetNumbers(betType, "number", 2);
  if (!values) {
    return false;
  }

  const [value] = values;
  return value >= 0 && value <= 36;
}

function isSplitBetType(betType: string): betType is SplitBetType {
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

function isStreetBetType(betType: string): betType is StreetBetType {
  const values = parseBetNumbers(betType, "street", 2);
  return values !== null && VALID_STREET_STARTS.has(values[0]);
}

function isCornerBetType(betType: string): betType is CornerBetType {
  const values = parseBetNumbers(betType, "corner", 2);
  return values !== null && VALID_CORNER_STARTS.has(values[0]);
}

function isSixlineBetType(betType: string): betType is SixlineBetType {
  const values = parseBetNumbers(betType, "sixline", 2);
  return values !== null && VALID_SIXLINE_STARTS.has(values[0]);
}

export function isBetWinning(betType: BetType, result: RouletteNumber): boolean {
  if (betType === "red") return RED_NUMBERS.includes(result);
  if (betType === "black") return BLACK_NUMBERS.includes(result);
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

  // split_A_B → wins if result is A or B
  if (isSplitBetType(betType)) {
    const parts = betType.split("_");
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    return result === a || result === b;
  }

  // street_X → wins if result ∈ {X, X+1, X+2}
  if (isStreetBetType(betType)) {
    const x = Number(betType.split("_")[1]);
    return result >= x && result <= x + 2;
  }

  // corner_X → wins if result ∈ {X, X+1, X+3, X+4}
  if (isCornerBetType(betType)) {
    const x = Number(betType.split("_")[1]);
    return result === x || result === x + 1 || result === x + 3 || result === x + 4;
  }

  // sixline_X → wins if result ∈ {X, X+1, X+2, X+3, X+4, X+5}
  if (isSixlineBetType(betType)) {
    const x = Number(betType.split("_")[1]);
    return result >= x && result <= x + 5;
  }

  return false;
}

export function getMultiplier(betType: BetType): number {
  if (isStraightBetType(betType)) return BET_MULTIPLIERS.number;
  if (isSplitBetType(betType)) return BET_MULTIPLIERS.split;
  if (isStreetBetType(betType)) return BET_MULTIPLIERS.street;
  if (isCornerBetType(betType)) return BET_MULTIPLIERS.corner;
  if (isSixlineBetType(betType)) return BET_MULTIPLIERS.sixline;
  return BET_MULTIPLIERS[betType as keyof typeof BET_MULTIPLIERS] ?? 1;
}

export function calculatePayout(bet: RouletteBet, result: RouletteNumber) {
  if (!isBetWinning(bet.type, result)) return 0;
  return bet.amount * bet.multiplier;
}

export function createBet(type: BetType, amount: number): RouletteBet {
  const multiplier = getMultiplier(type);
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    amount,
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
  for (const number of ALL_NUMBERS) counts.set(number, 0);
  history.slice(0, sampleSize).forEach((entry) => {
    counts.set(entry.number, (counts.get(entry.number) ?? 0) + 1);
  });
  const sorted = [...counts.entries()].sort((l, r) => r[1] - l[1]);
  return {
    hot: sorted.slice(0, 5).map(([number, count]) => ({ number, count })),
    cold: [...sorted].reverse().slice(0, 5).map(([number, count]) => ({ number, count })),
  };
}

export function getBetLabel(type: BetType) {
  if (isStraightBetType(type)) return type.replace("number_", "");
  if (isSplitBetType(type)) {
    const [_, a, b] = type.split("_");
    return `${a}–${b}`;
  }
  if (isStreetBetType(type)) return `Street ${type.split("_")[1]}`;
  if (isCornerBetType(type)) {
    const x = Number(type.split("_")[1]);
    return `Corner ${x}`;
  }
  if (isSixlineBetType(type)) return `6-line ${type.split("_")[1]}`;
  return type;
}
