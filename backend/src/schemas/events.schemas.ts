import { EventCategory, EventStatus, ProposalStatus } from "@prisma/client";
import { z } from "zod";

function trimString(value: string) {
  return value.trim();
}

const titleSchema = z.string().transform(trimString).pipe(z.string().min(5).max(200));
const optionSchema = z.string().transform(trimString).pipe(z.string().min(1).max(100));

const optionalTextSchema = z
  .string()
  .max(4000)
  .optional()
  .nullable()
  .transform((value) => {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const updatableOptionalTextSchema = z
  .union([z.string().max(4000), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalImageSchema = z
  .string()
  .max(500)
  .optional()
  .nullable()
  .transform((value) => {
    if (value == null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const updatableOptionalImageSchema = z
  .union([z.string().max(500), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalDateSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, context) => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date invalide.",
      });
      return z.NEVER;
    }

    return parsed;
  });

const updatableOptionalDateSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value, context) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value === "") {
      return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date invalide.",
      });
      return z.NEVER;
    }

    return parsed;
  });

const optionalAmountSchema = z
  .union([z.coerce.number().int().min(1).max(1_000_000), z.null()])
  .optional()
  .transform((value) => value ?? null);

const updatableOptionalAmountSchema = z
  .union([z.coerce.number().int().min(1).max(1_000_000), z.null()])
  .optional()
  .transform((value) => (value === undefined ? undefined : value));

const excludedUsersSchema = z.array(z.string().uuid()).max(50).optional().default([]);
const updatableExcludedUsersSchema = z.array(z.string().uuid()).max(50).optional();

const optionInitialOddsSchema = z
  .record(z.string(), z.number().min(1.01).max(100))
  .optional()
  .default({});

export const createEventSchema = z
  .object({
    title: titleSchema,
    description: optionalTextSchema,
    category: z.nativeEnum(EventCategory),
    proposal_id: z.string().uuid().optional(),
    image_url: optionalImageSchema,
    options: z.array(optionSchema).min(2).max(6),
    option_initial_odds: optionInitialOddsSchema,
    closing_at: optionalDateSchema,
    min_bet: z.coerce.number().int().min(1).max(1_000_000).default(10),
    max_bet: optionalAmountSchema,
    excluded_user_ids: excludedUsersSchema,
  })
  .refine((value) => value.max_bet == null || value.max_bet >= value.min_bet, {
    path: ["max_bet"],
    message: "La mise max doit etre superieure ou egale a la mise min.",
  });

export const updateEventSchema = z
  .object({
    title: titleSchema.optional(),
    description: updatableOptionalTextSchema,
    category: z.nativeEnum(EventCategory).optional(),
    image_url: updatableOptionalImageSchema,
    options: z.array(optionSchema).min(2).max(6).optional(),
    option_initial_odds: optionInitialOddsSchema,
    closing_at: updatableOptionalDateSchema,
    min_bet: z.coerce.number().int().min(1).max(1_000_000).optional(),
    max_bet: updatableOptionalAmountSchema,
    excluded_user_ids: updatableExcludedUsersSchema,
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Aucune modification transmise.",
  })
  .refine(
    (value) =>
      value.min_bet == null || value.max_bet == null || value.max_bet >= value.min_bet,
    {
      path: ["max_bet"],
      message: "La mise max doit etre superieure ou egale a la mise min.",
    },
  );

export const placeEventBetSchema = z.object({
  chosen_option: z.string().min(1).max(100).transform(trimString),
  amount: z.coerce.number().int().min(1).max(1_000_000),
});

export const placeSimpleBetsSchema = z.object({
  bets: z
    .array(
      z.object({
        eventId: z.string().uuid(),
        chosenOption: z.string().min(1).max(100).transform(trimString),
        amount: z.coerce.number().int().min(1).max(1_000_000),
      }),
    )
    .min(1)
    .max(15)
    .refine(
      (bets) => new Set(bets.map((bet) => bet.eventId)).size === bets.length,
      "Une seule selection par evenement est autorisee dans le panier simple.",
    ),
});

export const placeParlayBetSchema = z.object({
  legs: z
    .array(
      z.object({
        eventId: z.string().uuid(),
        chosenOption: z.string().min(1).max(100).transform(trimString),
      }),
    )
    .min(2)
    .max(15)
    .refine(
      (legs) => new Set(legs.map((leg) => leg.eventId)).size === legs.length,
      "Impossible de combiner deux issues du meme evenement.",
    ),
  stake: z.coerce.number().int().min(5).max(500),
});

export const resolveEventSchema = z.object({
  resolved_option: z.string().min(1).max(100).transform(trimString),
});

export const adminEventsQuerySchema = z.object({
  status: z.nativeEnum(EventStatus).optional(),
});

export const adminProposalsQuerySchema = z.object({
  status: z.nativeEnum(ProposalStatus).optional(),
});

export const userSearchQuerySchema = z.object({
  search: z.string().trim().min(1).max(100),
});

export const createProposalSchema = z.object({
  title: z.string().trim().min(10).max(200),
  description: optionalTextSchema,
  category: z.nativeEnum(EventCategory),
  suggested_date: optionalDateSchema,
});

export const rejectProposalSchema = z.object({
  reason: z.string().trim().min(1).max(1000),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type PlaceEventBetInput = z.infer<typeof placeEventBetSchema>;
export type PlaceSimpleBetsInput = z.infer<typeof placeSimpleBetsSchema>;
export type PlaceParlayBetInput = z.infer<typeof placeParlayBetSchema>;
export type ResolveEventInput = z.infer<typeof resolveEventSchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type RejectProposalInput = z.infer<typeof rejectProposalSchema>;
