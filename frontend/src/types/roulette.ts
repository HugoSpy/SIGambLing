export type RouletteNumber =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36;

export type RouletteColor = "red" | "black" | "green";

export type OutsideBetType =
  | "red"
  | "black"
  | "even"
  | "odd"
  | "1-18"
  | "19-36"
  | "dozen_1"
  | "dozen_2"
  | "dozen_3"
  | "column_1"
  | "column_2"
  | "column_3";

export type BetType = OutsideBetType | `number_${RouletteNumber}`;

export interface BetChipPosition {
  row: number;
  column: number;
}

export interface RouletteBet {
  id: string;
  type: BetType;
  amount: number;
  position?: BetChipPosition;
  multiplier: number;
  potentialWin: number;
}

export interface RouletteResult {
  number: RouletteNumber;
  color: RouletteColor;
  winningBets: RouletteBet[];
  totalPayout: number;
  timestamp: string;
}

export interface RouletteState {
  phase: "idle" | "betting" | "spinning" | "resolving" | "payout";
  bets: RouletteBet[];
  totalBet: number;
  balance: number;
  lastResults: RouletteResult[];
  isSpinning: boolean;
}

export interface WheelConfig {
  width: number;
  height: number;
  radius: number;
  innerRadius: number;
  centerX: number;
  centerY: number;
  segments: number;
  rotationDuration: number;
  minSpins: number;
  maxSpins: number;
}

export interface RouletteSpinRequestBet {
  type: BetType;
  amount: number;
}

export interface RouletteSpinResponse {
  game_id: string;
  result_number: RouletteNumber;
  result_color: RouletteColor;
  result: "win" | "loss";
  bet_amount: number;
  payout: number;
  new_balance: number;
  winning_bets: BetType[];
}

export interface RouletteSpinAnimationRequest {
  spinId: string;
  resultNumber: RouletteNumber;
}

export interface RouletteBoardCell {
  type: BetType;
  label: string;
  value?: RouletteNumber;
}
