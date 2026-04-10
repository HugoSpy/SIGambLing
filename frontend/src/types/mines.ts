export type MinesGamePhase = "idle" | "playing" | "won" | "lost";

export interface MinesStartResponse {
  gemsTotal: number;
  minesCount: number;
  betAmount: number;
  currentMultiplier: number;
  nextMultiplier: number;
  balance: number;
}

export interface MinesRevealResponse {
  result: "gem" | "mine";
  cellIndex: number;
  gemsFound?: number;
  currentMultiplier?: number;
  nextMultiplier?: number;
  potentialWin?: number;
  minePositions?: number[];
  gameStatus: "active" | "lost";
  balance?: number;
}

export interface MinesCashoutResponse {
  payout: number;
  multiplier: number;
  minePositions: number[];
  gameStatus: "won";
  balance: number;
}

export interface MinesCurrentResponse {
  gemsTotal: number;
  minesCount: number;
  betAmount: number;
  revealedCells: number[];
  gemsFound: number;
  currentMultiplier: number;
  nextMultiplier: number;
  potentialWin: number;
}

export type MinesCellState = "hidden" | "gem" | "mine";
