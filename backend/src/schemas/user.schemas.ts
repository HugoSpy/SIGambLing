import { z } from "zod";

export const updateUserProfileSchema = z.object({
  pseudo: z
    .string()
    .trim()
    .min(3, "Le pseudo doit contenir au moins 3 caractères.")
    .max(24, "Le pseudo doit contenir au maximum 24 caractères.")
    .regex(/^[A-Za-z0-9._-]+$/, "Le pseudo contient des caractères non autorisés.")
    .optional(),
  accept_odds_changes: z.boolean().optional(),
}).refine(
  (value) => value.pseudo !== undefined || value.accept_odds_changes !== undefined,
  "Aucune modification transmise.",
);

export const adjustUserBalanceSchema = z.object({
  amount: z
    .coerce
    .number()
    .int()
    .min(-1_000_000)
    .max(1_000_000)
    .refine((value) => value !== 0, "Le montant doit etre different de zero."),
  reason: z.string().trim().min(3, "Le motif est requis.").max(500, "Motif trop long."),
});

export const unlockUserBadgeSchema = z.object({
  badge_key: z.string().trim().min(1, "Le badge est requis.").max(50, "Badge invalide."),
});

export const updateUserRewardSchema = z.object({
  action: z.enum(["reset", "mark_claimed"]),
});

export const updateChatPreferencesSchema = z.object({
  chatPanelWidth: z.number().int().min(240).max(600),
});

export type UpdateChatPreferencesInput = z.infer<typeof updateChatPreferencesSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type AdjustUserBalanceInput = z.infer<typeof adjustUserBalanceSchema>;
export type UnlockUserBadgeInput = z.infer<typeof unlockUserBadgeSchema>;
export type UpdateUserRewardInput = z.infer<typeof updateUserRewardSchema>;
