import { z } from "zod";

export const shareWinSchema = z.object({
  winId: z.string().uuid("winId invalide."),
  winType: z.enum(["bet", "casino"], {
    errorMap: () => ({ message: "winType doit être 'bet' ou 'casino'." }),
  }),
});

export type ShareWinInput = z.infer<typeof shareWinSchema>;
