import { z } from "zod";

export const startMicrosoftAuthSchema = z.object({
  prompt: z.string().optional(),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1).optional(),
});
