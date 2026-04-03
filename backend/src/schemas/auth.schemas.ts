import { z } from "zod";

export const startMicrosoftAuthSchema = z.object({
  prompt: z.string().optional(),
});
