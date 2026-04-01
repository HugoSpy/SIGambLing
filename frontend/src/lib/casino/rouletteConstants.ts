import type {
  OutsideBetType,
  RouletteBoardCell,
  RouletteColor,
  RouletteNumber,
  WheelConfig,
} from "../../types/roulette";

export const WHEEL_SEQUENCE: RouletteNumber[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

export const RED_NUMBERS: RouletteNumber[] = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export const BLACK_NUMBERS: RouletteNumber[] = [
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
];

export const NUMBER_GRID_ROWS: RouletteNumber[][] = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

export const COLUMN_BET_BY_ROW: OutsideBetType[] = ["column_3", "column_2", "column_1"];

export const NUMBER_COLORS: Record<RouletteNumber, RouletteColor> = {
  0: "green",
  1: "red",
  2: "black",
  3: "red",
  4: "black",
  5: "red",
  6: "black",
  7: "red",
  8: "black",
  9: "red",
  10: "black",
  11: "black",
  12: "red",
  13: "black",
  14: "red",
  15: "black",
  16: "red",
  17: "black",
  18: "red",
  19: "red",
  20: "black",
  21: "red",
  22: "black",
  23: "red",
  24: "black",
  25: "red",
  26: "black",
  27: "red",
  28: "black",
  29: "black",
  30: "red",
  31: "black",
  32: "red",
  33: "black",
  34: "red",
  35: "black",
  36: "red",
};

export const BET_MULTIPLIERS: Record<OutsideBetType | "number", number> = {
  red: 2,
  black: 2,
  even: 2,
  odd: 2,
  "1-18": 2,
  "19-36": 2,
  dozen_1: 3,
  dozen_2: 3,
  dozen_3: 3,
  column_1: 3,
  column_2: 3,
  column_3: 3,
  number: 36,
};

export const DOZEN_BETS: RouletteBoardCell[] = [
  { type: "dozen_1", label: "1 to 12" },
  { type: "dozen_2", label: "13 to 24" },
  { type: "dozen_3", label: "25 to 36" },
];

export const OUTSIDE_BETS: RouletteBoardCell[] = [
  { type: "1-18", label: "1-18" },
  { type: "even", label: "EVEN" },
  { type: "red", label: "RED" },
  { type: "black", label: "BLACK" },
  { type: "odd", label: "ODD" },
  { type: "19-36", label: "19-36" },
];

export const UI_COLORS = {
  background: "#0F1724",
  backgroundLight: "#152338",
  felt: "#0b5f3a",
  red: "#ff1c5c",
  black: "#1f3240",
  green: "#00e701",
  gold: "#ffc857",
  ivory: "#fff8dd",
  blue: "#2f4553",
  blueLight: "#3d5664",
  white: "#ffffff",
  textGray: "#b1bad3",
  border: "#2a4153",
} as const;

export const WHEEL_CONFIG: WheelConfig = {
  width: 520,
  height: 520,
  radius: 210,
  innerRadius: 124,
  centerX: 260,
  centerY: 260,
  segments: 37,
  rotationDuration: 4.2,
  minSpins: 4,
  maxSpins: 6,
};

export const POINTER_ANGLE = -Math.PI / 2;

export const QUICK_BET_AMOUNTS = [10, 25, 50, 100, 250, 500];

export const ALL_NUMBERS: RouletteNumber[] = Array.from(
  { length: 37 },
  (_, index) => index as RouletteNumber,
);

export const MAX_BETS_PER_SPIN = 20;
