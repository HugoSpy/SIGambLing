import { z } from "zod";

const MIN_BET = 10;

const VALID_STREET_STARTS = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
const VALID_CORNER_STARTS = new Set([
  1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31,
  32,
]);
const VALID_SIXLINE_STARTS = new Set([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31]);

const baseRouletteBetTypes = [
  "red",
  "black",
  "even",
  "odd",
  "1-18",
  "19-36",
  "dozen_1",
  "dozen_2",
  "dozen_3",
  "column_1",
  "column_2",
  "column_3",
  ...Array.from({ length: 37 }, (_, index) => `number_${index}`),
] as const;

// split_A_B: two adjacent numbers (A < B), diff = 1 (vertical) or 3 (horizontal)
const splitBetSchema = z
  .string()
  .regex(/^split_\d{1,2}_\d{1,2}$/)
  .refine((val) => {
    const parts = val.split("_");
    const a = Number(parts[1]);
    const b = Number(parts[2]);
    if (a < 1 || b > 36 || a >= b) return false;
    const diff = b - a;
    if (diff === 1) return a % 3 !== 0; // vertical: same column
    if (diff === 3) return true;         // horizontal: same row
    return false;
  });

// street_X: X ∈ {1,4,7,...,34}
const streetBetSchema = z
  .string()
  .regex(/^street_\d{1,2}$/)
  .refine((val) => VALID_STREET_STARTS.has(Number(val.split("_")[1])));

// corner_X: covers {X, X+1, X+3, X+4}, X%3 != 0, X <= 32
const cornerBetSchema = z
  .string()
  .regex(/^corner_\d{1,2}$/)
  .refine((val) => VALID_CORNER_STARTS.has(Number(val.split("_")[1])));

// sixline_X: X ∈ {1,4,7,...,31}
const sixlineBetSchema = z
  .string()
  .regex(/^sixline_\d{1,2}$/)
  .refine((val) => VALID_SIXLINE_STARTS.has(Number(val.split("_")[1])));

export const rouletteBetTypeSchema = z.union([
  z.enum(baseRouletteBetTypes),
  splitBetSchema,
  streetBetSchema,
  cornerBetSchema,
  sixlineBetSchema,
]);

export const rouletteSpinSchema = z.object({
  bets: z
    .array(
      z.object({
        type: rouletteBetTypeSchema,
        amount: z.coerce.number().int().min(10),
      }),
    )
    .min(1)
    .max(20),
});

export type RouletteSpinInput = z.infer<typeof rouletteSpinSchema>;

export const hiloStartSchema = z.object({
  betAmount: z.coerce.number().int().min(10),
});

export const hiloPredictSchema = z.object({
  prediction: z.enum(["higher", "lower", "equal"]),
});

export type HiloStartInput = z.infer<typeof hiloStartSchema>;
export type HiloPredictInput = z.infer<typeof hiloPredictSchema>;

export const ridethebusStartSchema = z.object({
  betAmount: z.coerce.number().int().min(10),
});

export const ridethebusAnswerSchema = z.object({
  step: z.coerce.number().int().min(1).max(4),
  answer: z.enum([
    "red", "black",
    "higher_or_equal", "lower_or_equal",
    "inside", "outside",
    "hearts", "diamonds", "clubs", "spades",
  ]),
});

export type RidethebusStartInput = z.infer<typeof ridethebusStartSchema>;
export type RidethebusAnswerInput = z.infer<typeof ridethebusAnswerSchema>;

export const minesStartSchema = z.object({
  betAmount: z.coerce.number().int().min(MIN_BET),
  minesCount: z.coerce.number().int().min(1).max(24),
});

export const minesRevealSchema = z.object({
  cellIndex: z.coerce.number().int().min(0).max(24),
});

export const minesAutobetSchema = z.object({
  betAmount: z.coerce.number().int().min(MIN_BET),
  minesCount: z.coerce.number().int().min(1).max(24),
  selectedCells: z.union([
    z.literal("random"),
    z.array(z.number().int().min(0).max(24)).min(1).max(24),
  ]),
});

export type MinesStartInput = z.infer<typeof minesStartSchema>;
export type MinesRevealInput = z.infer<typeof minesRevealSchema>;
export type MinesAutobetInput = z.infer<typeof minesAutobetSchema>;

export const blackjackDealSchema = z.object({
  bet: z.coerce.number().int().min(1),
});

export const blackjackActionSchema = z.object({
  game_id: z.string().min(1).max(64),
});

export type BlackjackDealInput = z.infer<typeof blackjackDealSchema>;
export type BlackjackActionInput = z.infer<typeof blackjackActionSchema>;

export const crashBetSchema = z.object({
  amount: z.number().int().min(120).max(1_000_000),
  autoCashout: z.number().min(1.01).optional(),
});

export type CrashBetInput = z.infer<typeof crashBetSchema>;
