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
  theme_preference: z.enum(["dark", "light"]).optional(),
}).refine(
  (value) =>
    value.pseudo !== undefined ||
    value.accept_odds_changes !== undefined ||
    value.theme_preference !== undefined,
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
  chatPanelWidth:  z.number().int().min(240).max(800).optional(),
  chatPanelHeight: z.number().int().min(300).max(900).optional(),
  chatPanelX:      z.number().int().optional(),
  chatPanelY:      z.number().int().optional(),
  chatZoom:        z.number().int().min(75).max(150).optional(),
});

export const updatePinnedBadgesSchema = z.object({
  pinnedBadges: z
    .array(
      z.object({
        badgeType: z.string().trim().min(1).max(50),
        order: z.number().int().min(1).max(3),
      }),
    )
    .max(3, "Maximum 3 badges épinglés."),
});

export type UpdateChatPreferencesInput = z.infer<typeof updateChatPreferencesSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type AdjustUserBalanceInput = z.infer<typeof adjustUserBalanceSchema>;
export type UnlockUserBadgeInput = z.infer<typeof unlockUserBadgeSchema>;
export type UpdateUserRewardInput = z.infer<typeof updateUserRewardSchema>;
export type UpdatePinnedBadgesInput = z.infer<typeof updatePinnedBadgesSchema>;
