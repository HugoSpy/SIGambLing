export type HiloSuit = "hearts" | "diamonds" | "clubs" | "spades";

export interface HiloCard {
  suit: HiloSuit;
  value: number; // 1=As, 2-10, 11=J, 12=Q, 13=K
}

export interface MultiplierEntry {
  probability: number;
  multiplier: number;
}

export interface HiloMultipliers {
  higherOrEqual: MultiplierEntry | null;
  lowerOrEqual: MultiplierEntry | null;
  higher: MultiplierEntry | null;
  lower: MultiplierEntry | null;
  equal: MultiplierEntry | null;
}

export interface HiloStartResponse {
  currentCard: HiloCard;
  multipliers: HiloMultipliers;
  balance: number;
}

export interface HiloPredictResponse {
  correct: boolean;
  newCard: HiloCard;
  newMultiplier: number;
  multipliers: HiloMultipliers;
  gameOver: boolean;
  payout?: number;
  balance?: number;
}

export interface HiloSkipResponse {
  newCard: HiloCard;
  multipliers: HiloMultipliers;
}

export interface HiloCashOutResponse {
  payout: number;
  multiplier: number;
  balance: number;
}

export interface HiloCurrentResponse {
  currentCard: HiloCard;
  multipliers: HiloMultipliers;
  accumulatedMultiplier: number;
  roundsPlayed: number;
  initialBet: number;
  potentialPayout: number;
}

export interface HiloHistoryEntry {
  card: HiloCard;
  multiplier: number;
}

export type HiloGamePhase = "idle" | "playing" | "win" | "loss";
