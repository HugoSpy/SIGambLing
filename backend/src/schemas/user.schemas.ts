import { z } from "zod";

export const updateUserProfileSchema = z.object({
  pseudo: z
    .string()
    .trim()
    .min(3, "Le pseudo doit contenir au moins 3 caractères.")
    .max(24, "Le pseudo doit contenir au maximum 24 caractères.")
    .regex(/^[A-Za-z0-9._-]+$/, "Le pseudo contient des caractères non autorisés."),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
