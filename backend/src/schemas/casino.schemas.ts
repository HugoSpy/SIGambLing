import { z } from "zod";

const rouletteBetTypes = [
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

export const rouletteBetTypeSchema = z.enum(rouletteBetTypes);

export const rouletteSpinSchema = z.object({
  bets: z
    .array(
      z.object({
        type: rouletteBetTypeSchema,
        amount: z.coerce.number().int().min(10).max(10000),
      }),
    )
    .min(1)
    .max(20),
});

export type RouletteSpinInput = z.infer<typeof rouletteSpinSchema>;
