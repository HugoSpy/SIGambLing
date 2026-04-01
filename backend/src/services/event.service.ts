import {
  EventCategory,
  EventStatus,
  Prisma,
} from "@prisma/client";
import type { CreateEventInput, PlaceEventBetInput, UpdateEventInput } from "../schemas/events.schemas";
import { AppError } from "../utils/app-error";
import { prisma } from "./prisma.service";

const creatorSelect = {
  id: true,
  pseudo: true,
} satisfies Prisma.UserSelect;

const betSummarySelect = {
  id: true,
  userId: true,
  eventId: true,
  chosenOption: true,
  amount: true,
  oddAtBet: true,
  payout: true,
  createdAt: true,
} satisfies Prisma.BetSelect;

const excludedUserSelect = {
  user: {
    select: {
      id: true,
      pseudo: true,
      email: true,
      avatarUrl: true,
    },
  },
} satisfies Prisma.EventExclusionSelect;

type BetSummaryRecord = Prisma.BetGetPayload<{ select: typeof betSummarySelect }>;

type EventForViewer = Prisma.EventGetPayload<{
  include: {
    createdBy: { select: typeof creatorSelect };
    bets: { select: typeof betSummarySelect };
    excludedUsers: true;
  };
}>;

type EventForAdmin = Prisma.EventGetPayload<{
  include: {
    createdBy: { select: typeof creatorSelect };
    excludedUsers: { select: typeof excludedUserSelect };
    _count: { select: { bets: true } };
  };
}>;

type EventForBetHistory = Prisma.EventGetPayload<{
  select: {
    id: true;
    title: true;
    category: true;
    status: true;
    resolvedOption: true;
    closingAt: true;
    imageUrl: true;
  };
}>;

type BetWithEventRecord = Prisma.BetGetPayload<{
  select: {
    id: true;
    userId: true;
    eventId: true;
    chosenOption: true;
    amount: true;
    oddAtBet: true;
    payout: true;
    createdAt: true;
    event: {
      select: {
        id: true;
        title: true;
        category: true;
        status: true;
        resolvedOption: true;
        closingAt: true;
        imageUrl: true;
      };
    };
  };
}>;

function getOptionLabel(entry: Prisma.JsonValue) {
  if (typeof entry === "string") {
    return entry.trim();
  }

  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    const label = (entry as Record<string, unknown>).label;

    if (typeof label === "string") {
      return label.trim();
    }
  }

  return null;
}

function normalizeOptions(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    throw new AppError("Configuration d'options invalide.", 500);
  }

  const options = value
    .map((entry) => getOptionLabel(entry))
    .filter((entry): entry is string => Boolean(entry))
    .filter(Boolean);

  if (options.length < 2) {
    throw new AppError("L'evenement doit contenir au moins deux options.", 500);
  }

  return options;
}

function extractLegacyPoolByOption(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce<Record<string, number>>((accumulator, entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return accumulator;
    }

    const label = getOptionLabel(entry);
    const rawPool = (entry as Record<string, unknown>).total_bets;

    if (!label) {
      return accumulator;
    }

    accumulator[label] =
      typeof rawPool === "number" && Number.isFinite(rawPool) && rawPool > 0
        ? Math.round(rawPool)
        : 0;

    return accumulator;
  }, {});
}

function dedupeOptions(options: string[]) {
  const seen = new Set<string>();

  for (const option of options) {
    const key = option.toLocaleLowerCase("fr-FR");

    if (seen.has(key)) {
      throw new AppError("Les options doivent etre uniques.", 400);
    }

    seen.add(key);
  }
}

function normalizePoolByOption(value: Prisma.JsonValue, options: string[], rawOptions: Prisma.JsonValue) {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const legacyPoolByOption = extractLegacyPoolByOption(rawOptions);

  return options.reduce<Record<string, number>>((accumulator, option) => {
    const amount = source[option];
    accumulator[option] =
      typeof amount === "number" && Number.isFinite(amount) && amount > 0
        ? Math.round(amount)
        : (legacyPoolByOption[option] ?? 0);
    return accumulator;
  }, {});
}

function buildInitialPool(options: string[]) {
  return options.reduce<Record<string, number>>((accumulator, option) => {
    accumulator[option] = 0;
    return accumulator;
  }, {});
}

function calculateCurrentOdd(totalPool: number, optionPool: number) {
  if (totalPool <= 0 || optionPool <= 0) {
    return null;
  }

  return Number((totalPool / optionPool).toFixed(4));
}

function calculateProjectedOdd(totalPool: number, optionPool: number, amount: number) {
  return Number((((totalPool + amount) / (optionPool + amount)) || 1).toFixed(4));
}

function toSerializableOdd(value: Prisma.Decimal | number) {
  return Number(value);
}

function toSerializablePayout(value: number) {
  return value > 0 ? value : null;
}

function serializeEventOption(option: string, poolByOption: Record<string, number>, totalPool: number) {
  const optionPool = poolByOption[option] ?? 0;
  const percentage = totalPool > 0 ? Number(((optionPool / totalPool) * 100).toFixed(2)) : 0;

  return {
    label: option,
    pool: optionPool,
    percentage,
    odds: calculateCurrentOdd(totalPool, optionPool),
  };
}

function serializeEvent(event: EventForViewer) {
  const options = normalizeOptions(event.options);
  const poolByOption = normalizePoolByOption(event.poolByOption, options, event.options);
  const myBet = event.bets[0] ? serializeBet(event.bets[0]) : null;
  const excluded = event.excludedUsers.length > 0;
  const closedByDate = Boolean(event.closingAt && event.closingAt <= new Date());
  const computedStatus =
    event.status === EventStatus.OPEN && closedByDate ? EventStatus.CLOSED : event.status;
  const canBet =
    computedStatus === EventStatus.OPEN &&
    !excluded &&
    !myBet &&
    (!event.closingAt || event.closingAt > new Date());

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    image_url: event.imageUrl,
    options: options.map((option) => serializeEventOption(option, poolByOption, event.totalPool)),
    total_pool: event.totalPool,
    status: computedStatus,
    resolved_option: event.resolvedOption,
    closing_at: event.closingAt?.toISOString() ?? null,
    resolved_at: event.resolvedAt?.toISOString() ?? null,
    created_at: event.createdAt.toISOString(),
    updated_at: event.updatedAt.toISOString(),
    min_bet: event.minBet,
    max_bet: event.maxBet,
    is_excluded: excluded,
    can_bet: canBet,
    created_by: event.createdBy
      ? {
          id: event.createdBy.id,
          pseudo: event.createdBy.pseudo,
        }
      : null,
    my_bet: myBet,
  };
}

function serializeAdminEvent(event: EventForAdmin) {
  const options = normalizeOptions(event.options);
  const poolByOption = normalizePoolByOption(event.poolByOption, options, event.options);
  const closedByDate = Boolean(event.closingAt && event.closingAt <= new Date());
  const computedStatus =
    event.status === EventStatus.OPEN && closedByDate ? EventStatus.CLOSED : event.status;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    image_url: event.imageUrl,
    options: options.map((option) => serializeEventOption(option, poolByOption, event.totalPool)),
    total_pool: event.totalPool,
    status: computedStatus,
    resolved_option: event.resolvedOption,
    closing_at: event.closingAt?.toISOString() ?? null,
    resolved_at: event.resolvedAt?.toISOString() ?? null,
    created_at: event.createdAt.toISOString(),
    updated_at: event.updatedAt.toISOString(),
    min_bet: event.minBet,
    max_bet: event.maxBet,
    created_by: event.createdBy
      ? {
          id: event.createdBy.id,
          pseudo: event.createdBy.pseudo,
        }
      : null,
    excluded_users: event.excludedUsers.map((entry) => ({
      id: entry.user.id,
      pseudo: entry.user.pseudo,
      email: entry.user.email,
      avatar_url: entry.user.avatarUrl,
    })),
    bet_count: event._count.bets,
  };
}

function deriveBetOutcomeStatus(bet: BetSummaryRecord, event: EventForBetHistory) {
  if (event.status === EventStatus.CANCELLED) {
    return "CANCELLED" as const;
  }

  if (event.status !== EventStatus.RESOLVED) {
    return "PENDING" as const;
  }

  if (bet.chosenOption === event.resolvedOption && (bet.payout ?? 0) > 0) {
    return "WON" as const;
  }

  return "LOST" as const;
}

function serializeBet(bet: BetSummaryRecord) {
  return {
    id: bet.id,
    user_id: bet.userId,
    event_id: bet.eventId,
    chosen_option: bet.chosenOption,
    amount: bet.amount,
    odd_at_bet: toSerializableOdd(bet.oddAtBet),
    payout: toSerializablePayout(bet.payout),
    created_at: bet.createdAt.toISOString(),
  };
}

function serializeBetWithEvent(bet: BetWithEventRecord) {
  return {
    ...serializeBet(bet),
    status: deriveBetOutcomeStatus(bet, bet.event),
    event: {
      id: bet.event.id,
      title: bet.event.title,
      category: bet.event.category,
      status: bet.event.status,
      resolved_option: bet.event.resolvedOption,
      closing_at: bet.event.closingAt?.toISOString() ?? null,
      image_url: bet.event.imageUrl,
    },
  };
}

function assertCategory(category: string): category is EventCategory {
  return Object.values(EventCategory).includes(category as EventCategory);
}

function getFriendlyConstraintMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Cette valeur existe deja.";
  }

  return fallback;
}

class EventService {
  private async withSerializableTransaction<T>(
    callback: (transaction: Prisma.TransactionClient) => Promise<T>,
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(callback, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < 2
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new AppError("La transaction evenement a echoue.", 500);
  }

  async closeExpiredEvents() {
    await prisma.event.updateMany({
      where: {
        status: EventStatus.OPEN,
        closingAt: {
          not: null,
          lte: new Date(),
        },
      },
      data: {
        status: EventStatus.CLOSED,
      },
    });
  }

  async listOpenEvents(userId: string) {
    await this.closeExpiredEvents();

    const events = await prisma.event.findMany({
      where: {
        status: EventStatus.OPEN,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        createdBy: {
          select: creatorSelect,
        },
        bets: {
          where: { userId },
          select: betSummarySelect,
        },
        excludedUsers: {
          where: { userId },
        },
      },
    });

    return events.map((event) => serializeEvent(event));
  }

  async getEventById(userId: string, eventId: string) {
    await this.closeExpiredEvents();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        createdBy: {
          select: creatorSelect,
        },
        bets: {
          where: { userId },
          select: betSummarySelect,
        },
        excludedUsers: {
          where: { userId },
        },
      },
    });

    if (!event) {
      throw new AppError("Evenement introuvable.", 404);
    }

    return serializeEvent(event);
  }

  async getMyBet(userId: string, eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new AppError("Evenement introuvable.", 404);
    }

    const bet = await prisma.bet.findFirst({
      where: {
        userId,
        eventId,
      },
      select: betSummarySelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    return bet ? serializeBet(bet) : null;
  }

  async getUserBets(userId: string) {
    await this.closeExpiredEvents();

    const bets = await prisma.bet.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        ...betSummarySelect,
        event: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            resolvedOption: true,
            closingAt: true,
            imageUrl: true,
          },
        },
      },
    });

    return bets.map((bet) => serializeBetWithEvent(bet));
  }

  async searchUsers(search: string) {
    const query = search.trim();

    if (!query) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        isBanned: false,
        OR: [
          {
            pseudo: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: {
        pseudo: "asc",
      },
      take: 10,
      select: {
        id: true,
        pseudo: true,
        email: true,
        avatarUrl: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      pseudo: user.pseudo,
      email: user.email,
      avatar_url: user.avatarUrl,
    }));
  }

  async listAdminEvents(status?: EventStatus) {
    await this.closeExpiredEvents();

    const events = await prisma.event.findMany({
      where: status ? { status } : undefined,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        createdBy: {
          select: creatorSelect,
        },
        excludedUsers: {
          select: excludedUserSelect,
        },
        _count: {
          select: {
            bets: true,
          },
        },
      },
    });

    return events.map((event) => serializeAdminEvent(event));
  }

  private async ensureExcludedUsersExist(userIds: string[]) {
    if (userIds.length === 0) {
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        isBanned: false,
      },
      select: { id: true },
    });

    if (users.length !== new Set(userIds).size) {
      throw new AppError("Impossible d'exclure un ou plusieurs utilisateurs.", 400);
    }
  }

  private validateEventInput(
    input: Pick<CreateEventInput, "options" | "closing_at" | "min_bet" | "max_bet" | "category">,
  ) {
    dedupeOptions(input.options);

    if (!assertCategory(input.category)) {
      throw new AppError("Categorie invalide.", 400);
    }

    if (input.closing_at && input.closing_at <= new Date()) {
      throw new AppError("La date de cloture doit etre dans le futur.", 400);
    }

    if (input.max_bet != null && input.max_bet < input.min_bet) {
      throw new AppError("La mise max doit etre superieure ou egale a la mise min.", 400);
    }
  }

  async createEvent(adminId: string, input: CreateEventInput) {
    this.validateEventInput(input);
    const excludedUserIds = [...new Set(input.excluded_user_ids)];
    await this.ensureExcludedUsersExist(excludedUserIds);

    try {
      const createdEvent = await prisma.event.create({
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          imageUrl: input.image_url,
          options: input.options,
          poolByOption: buildInitialPool(input.options),
          totalPool: 0,
          status: EventStatus.OPEN,
          closingAt: input.closing_at,
          minBet: input.min_bet,
          maxBet: input.max_bet,
          createdById: adminId,
          excludedUsers: excludedUserIds.length
            ? {
                createMany: {
                  data: excludedUserIds.map((userId) => ({ userId })),
                },
              }
            : undefined,
        },
        include: {
          createdBy: {
            select: creatorSelect,
          },
          excludedUsers: {
            select: excludedUserSelect,
          },
          _count: {
            select: {
              bets: true,
            },
          },
        },
      });

      return serializeAdminEvent(createdEvent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(getFriendlyConstraintMessage(error, "Creation d'evenement impossible."), 409);
      }

      throw error;
    }
  }

  async updateEvent(eventId: string, input: UpdateEventInput) {
    await this.closeExpiredEvents();

    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        excludedUsers: true,
      },
    });

    if (!existingEvent) {
      throw new AppError("Evenement introuvable.", 404);
    }

    if (existingEvent.status !== EventStatus.OPEN) {
      throw new AppError("Seuls les evenements ouverts peuvent etre modifies.", 400);
    }

    const currentOptions = normalizeOptions(existingEvent.options);
    const nextOptions = input.options ?? currentOptions;
    dedupeOptions(nextOptions);

    if (
      existingEvent.totalPool > 0 &&
      JSON.stringify(currentOptions) !== JSON.stringify(nextOptions)
    ) {
      throw new AppError("Impossible de modifier les options apres les premiers paris.", 400);
    }

    const nextMinBet = input.min_bet ?? existingEvent.minBet;
    const nextMaxBet = input.max_bet === undefined ? existingEvent.maxBet : input.max_bet;
    const nextClosingAt =
      input.closing_at === undefined ? existingEvent.closingAt : input.closing_at;

    if (nextClosingAt && nextClosingAt <= new Date()) {
      throw new AppError("La date de cloture doit etre dans le futur.", 400);
    }

    if (nextMaxBet != null && nextMaxBet < nextMinBet) {
      throw new AppError("La mise max doit etre superieure ou egale a la mise min.", 400);
    }

    const excludedUserIds = input.excluded_user_ids
      ? [...new Set(input.excluded_user_ids)]
      : undefined;

    if (excludedUserIds) {
      await this.ensureExcludedUsersExist(excludedUserIds);
    }

    try {
      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          imageUrl: input.image_url,
          options: input.options,
          poolByOption:
            input.options && existingEvent.totalPool === 0
              ? buildInitialPool(input.options)
              : undefined,
          closingAt: input.closing_at === undefined ? undefined : input.closing_at,
          minBet: input.min_bet,
          maxBet: input.max_bet === undefined ? undefined : input.max_bet,
          excludedUsers: excludedUserIds
            ? {
                deleteMany: {},
                createMany: excludedUserIds.length
                  ? {
                      data: excludedUserIds.map((userId) => ({ userId })),
                    }
                  : undefined,
              }
            : undefined,
        },
        include: {
          createdBy: {
            select: creatorSelect,
          },
          excludedUsers: {
            select: excludedUserSelect,
          },
          _count: {
            select: {
              bets: true,
            },
          },
        },
      });

      return serializeAdminEvent(updatedEvent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(getFriendlyConstraintMessage(error, "Modification impossible."), 409);
      }

      throw error;
    }
  }

  async placeBet(userId: string, eventId: string, input: PlaceEventBetInput) {
    await this.closeExpiredEvents();

    try {
      return await this.withSerializableTransaction(async (transaction) => {
        const event = await transaction.event.findUnique({
          where: { id: eventId },
          include: {
            bets: {
              where: { userId },
              select: betSummarySelect,
            },
            excludedUsers: {
              where: { userId },
            },
            createdBy: {
              select: creatorSelect,
            },
          },
        });

        if (!event) {
          throw new AppError("Evenement introuvable.", 404);
        }

        if (event.status !== EventStatus.OPEN) {
          throw new AppError("Les paris sont fermes pour cet evenement.", 400);
        }

        if (event.closingAt && event.closingAt <= new Date()) {
          await transaction.event.update({
            where: { id: event.id },
            data: { status: EventStatus.CLOSED },
          });
          throw new AppError("La date de cloture est depassee.", 400);
        }

        if (event.excludedUsers.length > 0) {
          throw new AppError("Vous etes exclu de cet evenement.", 403);
        }

        if (event.bets.length > 0) {
          throw new AppError("Vous avez deja parie sur cet evenement.", 409);
        }

        if (input.amount < event.minBet) {
          throw new AppError(`La mise minimum est de ${event.minBet} tokens.`, 400);
        }

        if (event.maxBet != null && input.amount > event.maxBet) {
          throw new AppError(`La mise maximum est de ${event.maxBet} tokens.`, 400);
        }

        const options = normalizeOptions(event.options);

        if (!options.includes(input.chosen_option)) {
          throw new AppError("Option de pari invalide.", 400);
        }

        const debited = await transaction.user.updateMany({
          where: {
            id: userId,
            isBanned: false,
            balance: { gte: input.amount },
          },
          data: {
            balance: {
              decrement: input.amount,
            },
          },
        });

        if (debited.count !== 1) {
          throw new AppError("Solde insuffisant.", 400);
        }

        const poolByOption = normalizePoolByOption(event.poolByOption, options, event.options);
        const chosenPool = poolByOption[input.chosen_option] ?? 0;
        const nextPoolByOption = {
          ...poolByOption,
          [input.chosen_option]: chosenPool + input.amount,
        };

        const bet = await transaction.bet.create({
          data: {
            userId,
            eventId,
            chosenOption: input.chosen_option,
            amount: input.amount,
            oddAtBet: calculateProjectedOdd(event.totalPool, chosenPool, input.amount),
          },
          select: betSummarySelect,
        });

        await transaction.event.update({
          where: { id: eventId },
          data: {
            poolByOption: nextPoolByOption,
            totalPool: {
              increment: input.amount,
            },
          },
        });

        const updatedUser = await transaction.user.findUnique({
          where: { id: userId },
          select: {
            balance: true,
          },
        });

        if (!updatedUser) {
          throw new AppError("Utilisateur introuvable apres transaction.", 500);
        }

        return {
          bet: serializeBet(bet),
          new_balance: updatedUser.balance,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Vous avez deja parie sur cet evenement.", 409);
      }

      throw error;
    }
  }

  async closeEvent(eventId: string) {
    await this.closeExpiredEvents();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new AppError("Evenement introuvable.", 404);
    }

    if (event.status !== EventStatus.OPEN) {
      throw new AppError("Seuls les evenements ouverts peuvent etre clos.", 400);
    }

    const closedEvent = await prisma.event.update({
      where: { id: eventId },
      data: {
        status: EventStatus.CLOSED,
      },
      include: {
        createdBy: {
          select: creatorSelect,
        },
        excludedUsers: {
          select: excludedUserSelect,
        },
        _count: {
          select: {
            bets: true,
          },
        },
      },
    });

    return serializeAdminEvent(closedEvent);
  }

  async resolveEvent(eventId: string, resolvedOption: string) {
    await this.closeExpiredEvents();

    return this.withSerializableTransaction(async (transaction) => {
      const event = await transaction.event.findUnique({
        where: { id: eventId },
        include: {
          bets: {
            select: betSummarySelect,
          },
          createdBy: {
            select: creatorSelect,
          },
          excludedUsers: {
            select: excludedUserSelect,
          },
          _count: {
            select: {
              bets: true,
            },
          },
        },
      });

      if (!event) {
        throw new AppError("Evenement introuvable.", 404);
      }

      if (event.status !== EventStatus.OPEN && event.status !== EventStatus.CLOSED) {
        throw new AppError("Cet evenement ne peut pas etre resolu.", 400);
      }

      const options = normalizeOptions(event.options);

      if (!options.includes(resolvedOption)) {
        throw new AppError("Option gagnante invalide.", 400);
      }

      const finalPoolByOption = normalizePoolByOption(event.poolByOption, options, event.options);
      const winningPool = finalPoolByOption[resolvedOption] ?? 0;
      const resolutionDate = new Date();

      await transaction.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.RESOLVED,
          resolvedOption,
          resolvedAt: resolutionDate,
        },
      });

      for (const bet of event.bets) {
        const payout =
          bet.chosenOption === resolvedOption && winningPool > 0 && event.totalPool > 0
            ? Math.round((bet.amount / winningPool) * event.totalPool)
            : 0;

        if (payout > 0) {
          await transaction.user.update({
            where: { id: bet.userId },
            data: {
              balance: {
                increment: payout,
              },
            },
          });
        }

        await transaction.bet.update({
          where: { id: bet.id },
          data: {
            payout,
          },
        });
      }

      return serializeAdminEvent({
        ...event,
        status: EventStatus.RESOLVED,
        resolvedOption,
        resolvedAt: resolutionDate,
      });
    });
  }

  async cancelEvent(eventId: string) {
    return this.withSerializableTransaction(async (transaction) => {
      const event = await transaction.event.findUnique({
        where: { id: eventId },
        include: {
          bets: {
            select: betSummarySelect,
          },
          createdBy: {
            select: creatorSelect,
          },
          excludedUsers: {
            select: excludedUserSelect,
          },
          _count: {
            select: {
              bets: true,
            },
          },
        },
      });

      if (!event) {
        throw new AppError("Evenement introuvable.", 404);
      }

      if (event.status === EventStatus.RESOLVED || event.status === EventStatus.CANCELLED) {
        throw new AppError("Cet evenement ne peut plus etre annule.", 400);
      }

      await transaction.event.update({
        where: { id: eventId },
        data: {
          status: EventStatus.CANCELLED,
        },
      });

      for (const bet of event.bets) {
        await transaction.user.update({
          where: { id: bet.userId },
          data: {
            balance: {
              increment: bet.amount,
            },
          },
        });

        await transaction.bet.update({
          where: { id: bet.id },
          data: {
            payout: bet.amount,
          },
        });
      }

      return serializeAdminEvent({
        ...event,
        status: EventStatus.CANCELLED,
      });
    });
  }
}

export const eventService = new EventService();
