export type RidetheBusSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type RidetheBusColor = "red" | "black";

export interface RidetheBusCard {
  value: number; // 1=As, 2-10, 11=J, 12=Q, 13=K
  suit: RidetheBusSuit;
  color: RidetheBusColor;
}

export interface Step2Multipliers {
  higherOrEqual: number;
  lowerOrEqual: number;
  higherOrEqualProb: number;
  lowerOrEqualProb: number;
}

export interface Step3Multipliers {
  inside: number;
  outside: number;
  insideProb: number;
  outsideProb: number;
}

export interface RidetheBusStartResponse {
  step: 1;
  cards: RidetheBusCard[];
  currentMultiplier: number;
  step1Multiplier: number;
  betAmount: number;
  balance: number;
}

export interface RidetheBusAnswerResponse {
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

export interface RidetheBusCurrentResponse {
  step: 1 | 2 | 3 | 4;
  cards: RidetheBusCard[];
  currentMultiplier: number;
  betAmount: number;
  potentialWin: number;
  step1Multiplier: number;
  step2Multipliers?: Step2Multipliers;
  step3Multipliers?: Step3Multipliers;
}

export type RidetheBusGamePhase = "idle" | "playing" | "won" | "lost";
