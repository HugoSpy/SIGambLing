import {
  BetStatus,
  BetType,
  EventStatus,
  Prisma,
  ProposalStatus,
} from "@prisma/client";
import type {
  CreateEventInput,
  CreateProposalInput,
  PlaceEventBetInput,
  PlaceParlayBetInput,
  PlaceSimpleBetsInput,
  RejectProposalInput,
  UpdateEventInput,
} from "../schemas/events.schemas";
import { AppError } from "../utils/app-error";
import { gamificationService } from "./gamification.service";
import { jackpotService } from "./jackpot.service";
import { prisma } from "./prisma.service";

interface StoredEventOption {
  label: string;
  initial_odds: number;
  current_odds: number;
  total_staked: number;
  is_winning: boolean | null;
}

const creatorSelect = {
  id: true,
  pseudo: true,
} satisfies Prisma.UserSelect;

const eventSummarySelect = {
  id: true,
  title: true,
  category: true,
  status: true,
  resolvedOption: true,
  closingAt: true,
  imageUrl: true,
} satisfies Prisma.EventSelect;

const betLegSelect = {
  id: true,
  eventId: true,
  chosenOption: true,
  oddsAtBet: true,
  status: true,
  event: {
    select: eventSummarySelect,
  },
} satisfies Prisma.BetLegSelect;

const betSelect = {
  id: true,
  userId: true,
  eventId: true,
  chosenOption: true,
  amount: true,
  oddAtBet: true,
  status: true,
  type: true,
  potentialWin: true,
  payout: true,
  createdAt: true,
  resolvedAt: true,
  legs: {
    select: betLegSelect,
  },
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

type BetRecord = Prisma.BetGetPayload<{ select: typeof betSelect }>;
type EventSummaryRecord = Prisma.EventGetPayload<{ select: typeof eventSummarySelect }>;

type EventForViewer = Prisma.EventGetPayload<{
  include: {
    createdBy: { select: typeof creatorSelect };
    bets: { select: typeof betSelect };
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

type ProposalRecord = Prisma.EventProposalGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        pseudo: true;
        email: true;
        avatarUrl: true;
      };
    };
    reviewer: {
      select: {
        id: true;
        pseudo: true;
        email: true;
      };
    };
  };
}>;

type EventCreateData = Prisma.EventUncheckedCreateInput;

function trimString(value: string) {
  return value.trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundOdds(value: number) {
  return Number(value.toFixed(4));
}

function roundPercentage(value: number) {
  return Number(value.toFixed(2));
}

const LIVE_PARIMUTUEL_HOUSE_EDGE = 0.01;
const MAX_LIVE_ODDS = 99;

function calculatePotentialPayout(stake: number, odds: number) {
  return Math.floor(stake * odds);
}

function serializeBetStatus(status: BetStatus) {
  if (status === BetStatus.won) {
    return "WON" as const;
  }

  if (status === BetStatus.lost) {
    return "LOST" as const;
  }

  if (status === BetStatus.cancelled) {
    return "CANCELLED" as const;
  }

  return "PENDING" as const;
}

function serializeProposalStatus(status: ProposalStatus) {
  if (status === ProposalStatus.APPROVED) {
    return "APPROVED" as const;
  }

  if (status === ProposalStatus.REJECTED) {
    return "REJECTED" as const;
  }

  return "PENDING" as const;
}

function getOptionLabel(entry: Prisma.JsonValue) {
  if (typeof entry === "string") {
    const label = trimString(entry);
    return label.length > 0 ? label : null;
  }

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const label = (entry as Record<string, unknown>).label;

  if (typeof label !== "string") {
    return null;
  }

  const trimmed = trimString(label);
  return trimmed.length > 0 ? trimmed : null;
}

function extractLegacyPoolByOption(value: Prisma.JsonValue) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
      (accumulator, [key, rawValue]) => {
        accumulator[key] =
          typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue > 0
            ? Math.round(rawValue)
            : 0;

        return accumulator;
      },
      {},
    );
  }

  if (!Array.isArray(value)) {
    return {};
  }

  return value.reduce<Record<string, number>>((accumulator, entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return accumulator;
    }

    const label = getOptionLabel(entry);
    const totalBets = (entry as Record<string, unknown>).total_bets;
    const totalStaked = (entry as Record<string, unknown>).total_staked;

    if (!label) {
      return accumulator;
    }

    const amount =
      typeof totalStaked === "number" && Number.isFinite(totalStaked)
        ? totalStaked
        : typeof totalBets === "number" && Number.isFinite(totalBets)
          ? totalBets
          : 0;

    accumulator[label] = amount > 0 ? Math.round(amount) : 0;
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

function getDefaultInitialOdds(optionCount: number) {
  const overround = 1.05;
  return roundOdds(optionCount / overround);
}

function normalizeInitialOddsMap(
  optionLabels: string[],
  inputOdds: Record<string, number>,
  currentOptions?: StoredEventOption[],
) {
  const currentByLabel = new Map((currentOptions ?? []).map((option) => [option.label, option]));
  const fallbackOdd = getDefaultInitialOdds(optionLabels.length);

  return optionLabels.reduce<Record<string, number>>((accumulator, label) => {
    const requested = inputOdds[label];
    const current = currentByLabel.get(label);
    const nextOdd =
      typeof requested === "number" && Number.isFinite(requested)
        ? requested
        : current?.initial_odds ?? fallbackOdd;

    accumulator[label] = roundOdds(clamp(nextOdd, 1.01, 100));
    return accumulator;
  }, {});
}

function getMarginFromOdds(odds: number[]) {
  const impliedSum = odds.reduce((sum, odd) => sum + 1 / odd, 0);
  return Number((impliedSum - 1).toFixed(6));
}

function assertMargin(odds: number[]) {
  const margin = getMarginFromOdds(odds);

  if (margin < 0.02 || margin > 0.15) {
    throw new AppError(
      "La marge bookmaker doit etre comprise entre 2% et 15%.",
      400,
      { margin },
    );
  }

  return margin;
}

function normalizeStoredOptions(
  value: Prisma.JsonValue,
  poolByOptionValue: Prisma.JsonValue,
): StoredEventOption[] {
  if (!Array.isArray(value)) {
    throw new AppError("Configuration d'options invalide.", 500);
  }

  const legacyPoolByOption = extractLegacyPoolByOption(poolByOptionValue);
  const parsedOptions = value
    .map((entry): StoredEventOption | null => {
      if (typeof entry === "string") {
        const label = trimString(entry);

        if (!label) {
          return null;
        }

        const initialOdds = getDefaultInitialOdds(value.length);
        return {
          label,
          initial_odds: initialOdds,
          current_odds: initialOdds,
          total_staked: legacyPoolByOption[label] ?? 0,
          is_winning: null,
        };
      }

      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const label = getOptionLabel(record as Prisma.JsonValue);

      if (!label) {
        return null;
      }

      const initialOddsRaw = record.initial_odds;
      const currentOddsRaw = record.current_odds;
      const totalStakedRaw = record.total_staked;
      const isWinningRaw = record.is_winning;
      const fallbackOdd = getDefaultInitialOdds(value.length);
      const initialOdds =
        typeof initialOddsRaw === "number" && Number.isFinite(initialOddsRaw)
          ? initialOddsRaw
          : fallbackOdd;
      const currentOdds =
        typeof currentOddsRaw === "number" && Number.isFinite(currentOddsRaw)
          ? currentOddsRaw
          : initialOdds;
      const totalStaked =
        typeof totalStakedRaw === "number" && Number.isFinite(totalStakedRaw)
          ? totalStakedRaw
          : legacyPoolByOption[label] ?? 0;

      return {
        label,
        initial_odds: roundOdds(clamp(initialOdds, 1.01, 100)),
        current_odds: roundOdds(clamp(currentOdds, LIVE_PARIMUTUEL_HOUSE_EDGE, MAX_LIVE_ODDS)),
        total_staked: totalStaked > 0 ? Math.round(totalStaked) : 0,
        is_winning: typeof isWinningRaw === "boolean" ? isWinningRaw : null,
      };
    })
    .filter((entry): entry is StoredEventOption => Boolean(entry));

  if (parsedOptions.length < 2) {
    throw new AppError("L'evenement doit contenir au moins deux options.", 500);
  }

  dedupeOptions(parsedOptions.map((option) => option.label));
  assertMargin(parsedOptions.map((option) => option.initial_odds));

  return parsedOptions;
}

function recalculateLiveOptions(inputOptions: StoredEventOption[]) {
  const options = inputOptions.map((option) => ({ ...option }));
  const totalVolume = options.reduce((sum, option) => sum + option.total_staked, 0);

  if (totalVolume <= 0) {
    return options.map((option) => ({
      ...option,
      current_odds: roundOdds(option.initial_odds),
    }));
  }

  return options.map((option, index) => {
    const targetOdds =
      option.total_staked <= 0
        ? MAX_LIVE_ODDS
        : clamp(
            (totalVolume / option.total_staked) * (1 - LIVE_PARIMUTUEL_HOUSE_EDGE),
            LIVE_PARIMUTUEL_HOUSE_EDGE,
            MAX_LIVE_ODDS,
          );

    return {
      ...option,
      current_odds: roundOdds(targetOdds),
    };
  });
}

function buildStoredOptions(
  optionLabels: string[],
  optionInitialOdds: Record<string, number>,
  currentOptions?: StoredEventOption[],
) {
  dedupeOptions(optionLabels);
  const normalizedOdds = normalizeInitialOddsMap(optionLabels, optionInitialOdds, currentOptions);
  const nextOptions = optionLabels.map((label) => {
    const current = currentOptions?.find((entry) => entry.label === label);

    return {
      label,
      initial_odds: normalizedOdds[label],
      current_odds: current?.current_odds ?? normalizedOdds[label],
      total_staked: current?.total_staked ?? 0,
      is_winning: current?.is_winning ?? null,
    };
  });

  assertMargin(nextOptions.map((option) => option.initial_odds));
  return recalculateLiveOptions(nextOptions);
}

function buildPoolByOption(options: StoredEventOption[]) {
  return options.reduce<Record<string, number>>((accumulator, option) => {
    accumulator[option.label] = option.total_staked;
    return accumulator;
  }, {});
}

function toJsonOptions(options: StoredEventOption[]) {
  return options.map((option) => ({
    label: option.label,
    initial_odds: option.initial_odds,
    current_odds: option.current_odds,
    total_staked: option.total_staked,
    is_winning: option.is_winning,
  }));
}

function getEventType(options: StoredEventOption[]) {
  return options.length === 2 ? "BINARY" : "MULTIPLE_CHOICE";
}

function serializeEventOption(option: StoredEventOption, totalPool: number) {
  const percentage = totalPool > 0 ? (option.total_staked / totalPool) * 100 : 0;

  return {
    label: option.label,
    pool: option.total_staked,
    percentage: roundPercentage(percentage),
    odds: option.current_odds,
    initial_odds: option.initial_odds,
    current_odds: option.current_odds,
    is_winning: option.is_winning,
  };
}

function serializeEventSummary(event: EventSummaryRecord) {
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    status: event.status,
    resolved_option: event.resolvedOption,
    closing_at: event.closingAt?.toISOString() ?? null,
    image_url: event.imageUrl,
  };
}

function serializeBet(bet: BetRecord) {
  const calculatedOdds =
    bet.oddAtBet != null
      ? Number(bet.oddAtBet)
      : bet.legs.reduce((product, leg) => product * Number(leg.oddsAtBet), 1);

  return {
    id: bet.id,
    user_id: bet.userId,
    event_id: bet.eventId,
    chosen_option: bet.chosenOption,
    type: bet.type,
    status: serializeBetStatus(bet.status),
    stake: bet.amount,
    total_odds: roundOdds(calculatedOdds),
    odds_at_bet: bet.oddAtBet != null ? Number(bet.oddAtBet) : null,
    potential_payout: bet.potentialWin,
    actual_payout: bet.status === BetStatus.pending ? null : bet.payout,
    placed_at: bet.createdAt.toISOString(),
    resolved_at: bet.resolvedAt?.toISOString() ?? null,
    legs: bet.legs.map((leg) => ({
      id: leg.id,
      event_id: leg.eventId,
      chosen_option: leg.chosenOption,
      odds_at_bet: Number(leg.oddsAtBet),
      status: serializeBetStatus(leg.status),
      event: serializeEventSummary(leg.event),
    })),
  };
}

function serializeEvent(event: EventForViewer) {
  const options = normalizeStoredOptions(event.options, event.poolByOption);
  const totalPool = options.reduce((sum, option) => sum + option.total_staked, 0);
  const myBets = event.bets.map((bet) => serializeBet(bet));
  const excluded = event.excludedUsers.length > 0;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    type: getEventType(options),
    image_url: event.imageUrl,
    options: options.map((option) => serializeEventOption(option, totalPool)),
    total_pool: totalPool,
    status: event.status,
    resolved_option: event.resolvedOption,
    closing_at: event.closingAt?.toISOString() ?? null,
    resolved_at: event.resolvedAt?.toISOString() ?? null,
    created_at: event.createdAt.toISOString(),
    updated_at: event.updatedAt.toISOString(),
    min_bet: event.minBet,
    max_bet: event.maxBet,
    is_excluded: excluded,
    can_bet: event.status === EventStatus.OPEN && !excluded && myBets.length < 25,
    my_bets: myBets,
    my_bet_count: myBets.length,
    created_by: event.createdBy
      ? {
          id: event.createdBy.id,
          pseudo: event.createdBy.pseudo,
        }
      : null,
  };
}

function serializeAdminEvent(event: EventForAdmin) {
  const options = normalizeStoredOptions(event.options, event.poolByOption);
  const totalPool = options.reduce((sum, option) => sum + option.total_staked, 0);
  const margin = getMarginFromOdds(options.map((option) => option.initial_odds));

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    type: getEventType(options),
    image_url: event.imageUrl,
    options: options.map((option) => serializeEventOption(option, totalPool)),
    total_pool: totalPool,
    status: event.status,
    resolved_option: event.resolvedOption,
    closing_at: event.closingAt?.toISOString() ?? null,
    resolved_at: event.resolvedAt?.toISOString() ?? null,
    created_at: event.createdAt.toISOString(),
    updated_at: event.updatedAt.toISOString(),
    min_bet: event.minBet,
    max_bet: event.maxBet,
    house_margin: roundPercentage(margin * 100),
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

function serializeProposal(proposal: ProposalRecord) {
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description,
    category: proposal.category,
    suggested_date: proposal.suggestedDate?.toISOString() ?? null,
    status: serializeProposalStatus(proposal.status),
    created_at: proposal.createdAt.toISOString(),
    reviewed_at: proposal.reviewedAt?.toISOString() ?? null,
    rejection_reason: proposal.rejectionReason,
    user: {
      id: proposal.user.id,
      pseudo: proposal.user.pseudo,
      email: proposal.user.email,
      avatar_url: proposal.user.avatarUrl,
    },
    reviewer: proposal.reviewer
      ? {
          id: proposal.reviewer.id,
          pseudo: proposal.reviewer.pseudo,
          email: proposal.reviewer.email,
        }
      : null,
  };
}

function buildOddsHistoryEntries(eventId: string, options: StoredEventOption[]) {
  return options.map((option) => ({
    eventId,
    option: option.label,
    odds: option.current_odds,
    totalStaked: option.total_staked,
  }));
}

function getFriendlyConstraintMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "Cette valeur existe deja.";
  }

  return fallback;
}

type SettledBetRecord = Prisma.BetGetPayload<{
  include: {
    legs: true;
  };
}>;

function computeBetSettlement(bet: SettledBetRecord) {
  if (bet.status !== BetStatus.pending) {
    return null;
  }

  if (bet.legs.some((leg) => leg.status === BetStatus.pending)) {
    return null;
  }

  const resolvedAt = new Date();

  if (bet.legs.some((leg) => leg.status === BetStatus.lost)) {
    return {
      status: BetStatus.lost,
      payout: 0,
      resolvedAt,
    };
  }

  const winningLegs = bet.legs.filter((leg) => leg.status === BetStatus.won);

  if (winningLegs.length === 0) {
    return {
      status: BetStatus.cancelled,
      payout: bet.amount,
      resolvedAt,
    };
  }

  const combinedOdds = winningLegs.reduce((product, leg) => product * Number(leg.oddsAtBet), 1);

  return {
    status: BetStatus.won,
    payout: calculatePotentialPayout(bet.amount, combinedOdds),
    resolvedAt,
  };
}

function isClosingDateExpired(closingAt: Date | null) {
  return Boolean(closingAt && closingAt <= new Date());
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

  private async logAdminAction(
    transaction: Prisma.TransactionClient,
    adminId: string,
    actionType: string,
    targetId: string | null,
    details?: Prisma.JsonObject,
  ) {
    await transaction.adminLog.create({
      data: {
        adminId,
        actionType,
        targetId,
        details,
      },
    });
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

  private async ensureExcludedUsersExist(userIds: string[]) {
    if (userIds.length === 0) {
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
        isBanned: false,
      },
      select: {
        id: true,
      },
    });

    if (users.length !== new Set(userIds).size) {
      throw new AppError("Impossible d'exclure un ou plusieurs utilisateurs.", 400);
    }
  }

  private validateEventInput(
    input: Pick<CreateEventInput, "options" | "closing_at" | "min_bet" | "max_bet">,
  ) {
    dedupeOptions(input.options);

    if (input.closing_at && input.closing_at <= new Date()) {
      throw new AppError("La date de cloture doit etre dans le futur.", 400);
    }

    if (input.max_bet != null && input.max_bet < input.min_bet) {
      throw new AppError("La mise max doit etre superieure ou egale a la mise min.", 400);
    }
  }

  async listOpenEvents(userId: string) {
    await this.closeExpiredEvents();

    const events = await prisma.event.findMany({
      where: {
        status: EventStatus.OPEN,
      },
      orderBy: [
        {
          totalPool: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        createdBy: {
          select: creatorSelect,
        },
        bets: {
          where: {
            userId,
            type: BetType.SIMPLE,
          },
          select: betSelect,
          orderBy: {
            createdAt: "desc",
          },
        },
        excludedUsers: {
          where: {
            userId,
          },
        },
      },
    });

    return events.map((event) => serializeEvent(event));
  }

  async getEventById(userId: string, eventId: string) {
    await this.closeExpiredEvents();

    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      include: {
        createdBy: {
          select: creatorSelect,
        },
        bets: {
          where: {
            userId,
            type: BetType.SIMPLE,
          },
          select: betSelect,
          orderBy: {
            createdAt: "desc",
          },
        },
        excludedUsers: {
          where: {
            userId,
          },
        },
      },
    });

    if (!event) {
      throw new AppError("Evenement introuvable.", 404);
    }

    return serializeEvent(event);
  }

  async getEventOddsHistory(eventId: string) {
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        options: true,
        poolByOption: true,
      },
    });

    if (!event) {
      throw new AppError("Evenement introuvable.", 404);
    }

    const history = await prisma.oddsHistory.findMany({
      where: {
        eventId,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    const grouped = history.reduce<Record<string, Array<{ odds: number; total_staked: number; timestamp: string }>>>(
      (accumulator, entry) => {
        accumulator[entry.option] = accumulator[entry.option] ?? [];
        accumulator[entry.option].push({
          odds: Number(entry.odds),
          total_staked: entry.totalStaked,
          timestamp: entry.timestamp.toISOString(),
        });
        return accumulator;
      },
      {},
    );

    const options = normalizeStoredOptions(event.options, event.poolByOption);

    for (const option of options) {
      if (!grouped[option.label] || grouped[option.label].length === 0) {
        grouped[option.label] = [
          {
            odds: option.current_odds,
            total_staked: option.total_staked,
            timestamp: new Date().toISOString(),
          },
        ];
      }
    }

    return {
      event_id: eventId,
      series: Object.entries(grouped).map(([option, points]) => ({
        option,
        points,
      })),
    };
  }

  async getMyBet(userId: string, eventId: string) {
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      throw new AppError("Evenement introuvable.", 404);
    }

    const bet = await prisma.bet.findFirst({
      where: {
        userId,
        eventId,
        type: BetType.SIMPLE,
      },
      select: betSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    return bet ? serializeBet(bet) : null;
  }

  async getUserBets(userId: string) {
    await this.closeExpiredEvents();

    const bets = await prisma.bet.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: betSelect,
    });

    return bets.map((bet) => serializeBet(bet));
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
      where: status
        ? {
            status,
          }
        : undefined,
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

  async createEvent(adminId: string, input: CreateEventInput) {
    this.validateEventInput(input);

    const excludedUserIds = [...new Set(input.excluded_user_ids)];
    await this.ensureExcludedUsersExist(excludedUserIds);

    const options = buildStoredOptions(input.options, input.option_initial_odds);
    const poolByOption = buildPoolByOption(options);
    const totalPool = options.reduce((sum, option) => sum + option.total_staked, 0);

    try {
      const createdEvent = await this.withSerializableTransaction(async (transaction) => {
        let approvedProposalId: string | null = null;

        if (input.proposal_id) {
          const proposal = await transaction.eventProposal.findUnique({
            where: {
              id: input.proposal_id,
            },
          });

          if (!proposal) {
            throw new AppError("Proposition introuvable.", 404);
          }

          if (proposal.status !== ProposalStatus.PENDING) {
            throw new AppError(
              "Seules les propositions en attente peuvent etre converties en evenement.",
              400,
            );
          }

          approvedProposalId = proposal.id;
        }

        const eventData: EventCreateData = {
          title: input.title,
          description: input.description,
          category: input.category,
          imageUrl: input.image_url,
          options: toJsonOptions(options),
          poolByOption,
          totalPool,
          status: EventStatus.OPEN,
          closingAt: input.closing_at,
          minBet: input.min_bet,
          maxBet: input.max_bet,
          createdById: adminId,
          excludedUsers: excludedUserIds.length
            ? {
                createMany: {
                  data: excludedUserIds.map((userId) => ({
                    userId,
                  })),
                },
              }
            : undefined,
        };

        const event = await transaction.event.create({
          data: eventData,
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

        if (approvedProposalId) {
          await transaction.eventProposal.update({
            where: {
              id: approvedProposalId,
            },
            data: {
              status: ProposalStatus.APPROVED,
              reviewedById: adminId,
              reviewedAt: new Date(),
              rejectionReason: null,
            },
          });
        }

        await transaction.oddsHistory.createMany({
          data: buildOddsHistoryEntries(event.id, options),
        });

        await this.logAdminAction(transaction, adminId, "event_created", event.id, {
          title: event.title,
          proposal_id: approvedProposalId,
        });

        if (approvedProposalId) {
          await this.logAdminAction(transaction, adminId, "proposal_approved", approvedProposalId, {
            event_id: event.id,
          });
        }

        await gamificationService.synchronizeUserBadges(adminId, transaction);

        return event;
      });

      return serializeAdminEvent(createdEvent);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(getFriendlyConstraintMessage(error, "Creation d'evenement impossible."), 409);
      }

      throw error;
    }
  }

  async updateEvent(adminId: string, eventId: string, input: UpdateEventInput) {
    await this.closeExpiredEvents();

    const existingEvent = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
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

    const currentOptions = normalizeStoredOptions(existingEvent.options, existingEvent.poolByOption);
    const nextLabels = input.options ?? currentOptions.map((option) => option.label);
    dedupeOptions(nextLabels);

    if (
      existingEvent.totalPool > 0 &&
      input.options &&
      JSON.stringify(currentOptions.map((option) => option.label)) !== JSON.stringify(nextLabels)
    ) {
      throw new AppError("Impossible de modifier les options apres les premiers paris.", 400);
    }

    if (existingEvent.totalPool > 0 && input.option_initial_odds && Object.keys(input.option_initial_odds).length > 0) {
      throw new AppError("Impossible de modifier les cotes initiales apres les premiers paris.", 400);
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

    const nextOptions = buildStoredOptions(nextLabels, input.option_initial_odds, currentOptions);

    try {
      const updatedEvent = await this.withSerializableTransaction(async (transaction) => {
        const event = await transaction.event.update({
          where: {
            id: eventId,
          },
          data: {
            title: input.title,
            description: input.description,
            category: input.category,
            imageUrl: input.image_url,
            options: toJsonOptions(nextOptions),
            poolByOption: buildPoolByOption(nextOptions),
            totalPool: nextOptions.reduce((sum, option) => sum + option.total_staked, 0),
            closingAt: input.closing_at === undefined ? undefined : input.closing_at,
            minBet: input.min_bet,
            maxBet: input.max_bet === undefined ? undefined : input.max_bet,
            excludedUsers: excludedUserIds
              ? {
                  deleteMany: {},
                  createMany: excludedUserIds.length
                    ? {
                        data: excludedUserIds.map((userId) => ({
                          userId,
                        })),
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

        await this.logAdminAction(transaction, adminId, "event_updated", event.id, {
          title: event.title,
        });

        return event;
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

    return this.withSerializableTransaction(async (transaction) => {
      const event = await transaction.event.findUnique({
        where: {
          id: eventId,
        },
        include: {
          bets: {
            where: {
              userId,
              type: BetType.SIMPLE,
            },
            select: {
              id: true,
            },
          },
          excludedUsers: {
            where: {
              userId,
            },
          },
        },
      });

      if (!event) {
        throw new AppError("Evenement introuvable.", 404);
      }

      if (event.status !== EventStatus.OPEN) {
        throw new AppError("Les paris sont fermes pour cet evenement.", 400);
      }

      if (isClosingDateExpired(event.closingAt)) {
        await transaction.event.update({
          where: {
            id: event.id,
          },
          data: {
            status: EventStatus.CLOSED,
          },
        });
        throw new AppError("La date de cloture est depassee.", 400);
      }

      if (event.excludedUsers.length > 0) {
        throw new AppError("Vous etes exclu de cet evenement.", 403);
      }

      if (event.bets.length >= 25) {
        throw new AppError("Limite de 25 paris atteinte sur cet evenement.", 400);
      }

      if (input.amount < event.minBet) {
        throw new AppError(`La mise minimum est de ${event.minBet} tokens.`, 400);
      }

      if (event.maxBet != null && input.amount > event.maxBet) {
        throw new AppError(`La mise maximum est de ${event.maxBet} tokens.`, 400);
      }

      const options = normalizeStoredOptions(event.options, event.poolByOption);
      const chosenOption = options.find((option) => option.label === input.chosen_option);

      if (!chosenOption) {
        throw new AppError("Option de pari invalide.", 400);
      }

      const debited = await transaction.user.updateMany({
        where: {
          id: userId,
          isBanned: false,
          balance: {
            gte: input.amount,
          },
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

      const oddsAtBet = chosenOption.current_odds;
      const nextOptions = recalculateLiveOptions(
        options.map((option) =>
          option.label === chosenOption.label
            ? {
                ...option,
                total_staked: option.total_staked + input.amount,
              }
            : option,
        ),
      );

      const bet = await transaction.bet.create({
        data: {
          userId,
          eventId,
          chosenOption: chosenOption.label,
          amount: input.amount,
          oddAtBet: oddsAtBet,
          type: BetType.SIMPLE,
          status: BetStatus.pending,
          potentialWin: calculatePotentialPayout(input.amount, oddsAtBet),
          legs: {
            create: {
              eventId,
              chosenOption: chosenOption.label,
              oddsAtBet,
              status: BetStatus.pending,
            },
          },
        },
        select: betSelect,
      });

      await jackpotService.recordEventContribution(userId, input.amount, "simple", bet.id, transaction);

      await transaction.event.update({
        where: {
          id: eventId,
        },
        data: {
          options: toJsonOptions(nextOptions),
          poolByOption: buildPoolByOption(nextOptions),
          totalPool: nextOptions.reduce((sum, option) => sum + option.total_staked, 0),
        },
      });

      await transaction.oddsHistory.createMany({
        data: buildOddsHistoryEntries(eventId, nextOptions),
      });

      const updatedUser = await transaction.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          balance: true,
        },
      });

      if (!updatedUser) {
        throw new AppError("Utilisateur introuvable apres transaction.", 500);
      }

      await gamificationService.synchronizeUserBadges(userId, transaction);

      return {
        bet: serializeBet(bet),
        new_balance: updatedUser.balance,
      };
    });
  }

  async placeSimpleBets(userId: string, input: PlaceSimpleBetsInput) {
    await this.closeExpiredEvents();

    const eventIds = input.bets.map((bet) => bet.eventId);
    const totalStake = input.bets.reduce((sum, bet) => sum + bet.amount, 0);

    return this.withSerializableTransaction(async (transaction) => {
      const events = await transaction.event.findMany({
        where: {
          id: {
            in: eventIds,
          },
        },
        include: {
          bets: {
            where: {
              userId,
              type: BetType.SIMPLE,
            },
            select: {
              id: true,
            },
          },
          excludedUsers: {
            where: {
              userId,
            },
          },
        },
      });

      if (events.length !== eventIds.length) {
        throw new AppError("Un ou plusieurs evenements sont introuvables.", 404);
      }

      const eventById = new Map(events.map((event) => [event.id, event]));
      const preparedBets: Array<{
        event: (typeof events)[number];
        amount: number;
        chosenOption: StoredEventOption;
        nextOptions: StoredEventOption[];
      }> = [];

      for (const betInput of input.bets) {
        const event = eventById.get(betInput.eventId);

        if (!event) {
          throw new AppError("Un ou plusieurs evenements sont introuvables.", 404);
        }

        if (event.status !== EventStatus.OPEN) {
          throw new AppError("Tous les evenements du panier doivent etre ouverts.", 400);
        }

        if (isClosingDateExpired(event.closingAt)) {
          await transaction.event.update({
            where: {
              id: event.id,
            },
            data: {
              status: EventStatus.CLOSED,
            },
          });
          throw new AppError("Un des evenements du panier est deja ferme.", 400);
        }

        if (event.excludedUsers.length > 0) {
          throw new AppError("Vous etes exclu d'un des evenements selectionnes.", 403);
        }

        if (event.bets.length >= 25) {
          throw new AppError(`Limite de 25 paris atteinte sur ${event.title}.`, 400);
        }

        if (betInput.amount < event.minBet) {
          throw new AppError(`La mise minimum pour ${event.title} est de ${event.minBet} tokens.`, 400);
        }

        if (event.maxBet != null && betInput.amount > event.maxBet) {
          throw new AppError(`La mise maximum pour ${event.title} est de ${event.maxBet} tokens.`, 400);
        }

        const options = normalizeStoredOptions(event.options, event.poolByOption);
        const chosenOption = options.find((option) => option.label === betInput.chosenOption);

        if (!chosenOption) {
          throw new AppError(`Option invalide pour ${event.title}.`, 400);
        }

        const nextOptions = recalculateLiveOptions(
          options.map((option) =>
            option.label === chosenOption.label
              ? {
                  ...option,
                  total_staked: option.total_staked + betInput.amount,
                }
              : option,
          ),
        );

        preparedBets.push({
          event,
          amount: betInput.amount,
          chosenOption,
          nextOptions,
        });
      }

      const debited = await transaction.user.updateMany({
        where: {
          id: userId,
          isBanned: false,
          balance: {
            gte: totalStake,
          },
        },
        data: {
          balance: {
            decrement: totalStake,
          },
        },
      });

      if (debited.count !== 1) {
        throw new AppError("Solde insuffisant.", 400);
      }

      const createdBets: BetRecord[] = [];

      for (const prepared of preparedBets) {
        const oddsAtBet = prepared.chosenOption.current_odds;

        const bet = await transaction.bet.create({
          data: {
            userId,
            eventId: prepared.event.id,
            chosenOption: prepared.chosenOption.label,
            amount: prepared.amount,
            oddAtBet: oddsAtBet,
            type: BetType.SIMPLE,
            status: BetStatus.pending,
            potentialWin: calculatePotentialPayout(prepared.amount, oddsAtBet),
            legs: {
              create: {
                eventId: prepared.event.id,
                chosenOption: prepared.chosenOption.label,
                oddsAtBet,
                status: BetStatus.pending,
              },
            },
          },
          select: betSelect,
        });

        createdBets.push(bet);

        await jackpotService.recordEventContribution(
          userId,
          prepared.amount,
          "simple",
          bet.id,
          transaction,
        );

        await transaction.event.update({
          where: {
            id: prepared.event.id,
          },
          data: {
            options: toJsonOptions(prepared.nextOptions),
            poolByOption: buildPoolByOption(prepared.nextOptions),
            totalPool: prepared.nextOptions.reduce((sum, option) => sum + option.total_staked, 0),
          },
        });

        await transaction.oddsHistory.createMany({
          data: buildOddsHistoryEntries(prepared.event.id, prepared.nextOptions),
        });
      }

      const updatedUser = await transaction.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          balance: true,
        },
      });

      if (!updatedUser) {
        throw new AppError("Utilisateur introuvable apres transaction.", 500);
      }

      await gamificationService.synchronizeUserBadges(userId, transaction);

      return {
        bets: createdBets.map((bet) => serializeBet(bet)),
        new_balance: updatedUser.balance,
      };
    });
  }

  async placeParlayBet(userId: string, input: PlaceParlayBetInput) {
    await this.closeExpiredEvents();

    const uniqueEventIds = new Set(input.legs.map((leg) => leg.eventId));

    if (uniqueEventIds.size !== input.legs.length) {
      throw new AppError("Impossible de combiner deux issues du meme evenement.", 400);
    }

    return this.withSerializableTransaction(async (transaction) => {
      const events = await transaction.event.findMany({
        where: {
          id: {
            in: [...uniqueEventIds],
          },
        },
        include: {
          excludedUsers: {
            where: {
              userId,
            },
          },
        },
      });

      if (events.length !== input.legs.length) {
        throw new AppError("Un ou plusieurs evenements sont introuvables.", 404);
      }

      const eventById = new Map(events.map((event) => [event.id, event]));
      const eventStates = new Map<string, { options: StoredEventOption[]; totalPool: number }>();
      const legOdds = new Map<string, number>();
      let totalOdds = 1;

      for (const leg of input.legs) {
        const event = eventById.get(leg.eventId);

        if (!event) {
          throw new AppError("Un ou plusieurs evenements sont introuvables.", 404);
        }

        if (event.status !== EventStatus.OPEN) {
          throw new AppError("Tous les evenements du combine doivent etre ouverts.", 400);
        }

        if (isClosingDateExpired(event.closingAt)) {
          await transaction.event.update({
            where: {
              id: event.id,
            },
            data: {
              status: EventStatus.CLOSED,
            },
          });
          throw new AppError("Un des evenements du combine est deja ferme.", 400);
        }

        if (event.excludedUsers.length > 0) {
          throw new AppError("Vous etes exclu d'un des evenements selectionnes.", 403);
        }

        const options = normalizeStoredOptions(event.options, event.poolByOption);
        const chosenOption = options.find((option) => option.label === leg.chosenOption);

        if (!chosenOption) {
          throw new AppError("Une option du combine est invalide.", 400);
        }

        legOdds.set(`${leg.eventId}:${leg.chosenOption}`, chosenOption.current_odds);
        totalOdds *= chosenOption.current_odds;

        const nextOptions = recalculateLiveOptions(
          options.map((option) =>
            option.label === chosenOption.label
              ? {
                  ...option,
                  total_staked: option.total_staked + input.stake,
                }
              : option,
          ),
        );

        eventStates.set(event.id, {
          options: nextOptions,
          totalPool: nextOptions.reduce((sum, option) => sum + option.total_staked, 0),
        });
      }

      const debited = await transaction.user.updateMany({
        where: {
          id: userId,
          isBanned: false,
          balance: {
            gte: input.stake,
          },
        },
        data: {
          balance: {
            decrement: input.stake,
          },
        },
      });

      if (debited.count !== 1) {
        throw new AppError("Solde insuffisant.", 400);
      }

      const bet = await transaction.bet.create({
        data: {
          userId,
          amount: input.stake,
          oddAtBet: roundOdds(totalOdds),
          type: BetType.PARLAY,
          status: BetStatus.pending,
          potentialWin: calculatePotentialPayout(input.stake, totalOdds),
          legs: {
            create: input.legs.map((leg) => ({
              eventId: leg.eventId,
              chosenOption: leg.chosenOption,
              oddsAtBet: legOdds.get(`${leg.eventId}:${leg.chosenOption}`) ?? 1,
              status: BetStatus.pending,
            })),
          },
        },
        select: betSelect,
      });

      await jackpotService.recordEventContribution(userId, input.stake, "parlay", bet.id, transaction);

      for (const [currentEventId, state] of eventStates.entries()) {
        await transaction.event.update({
          where: {
            id: currentEventId,
          },
          data: {
            options: toJsonOptions(state.options),
            poolByOption: buildPoolByOption(state.options),
            totalPool: state.totalPool,
          },
        });

        await transaction.oddsHistory.createMany({
          data: buildOddsHistoryEntries(currentEventId, state.options),
        });
      }

      const updatedUser = await transaction.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          balance: true,
        },
      });

      if (!updatedUser) {
        throw new AppError("Utilisateur introuvable apres transaction.", 500);
      }

      await gamificationService.synchronizeUserBadges(userId, transaction);

      return {
        bet: serializeBet(bet),
        new_balance: updatedUser.balance,
      };
    });
  }

  async closeEvent(adminId: string, eventId: string) {
    await this.closeExpiredEvents();

    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      throw new AppError("Evenement introuvable.", 404);
    }

    if (event.status !== EventStatus.OPEN) {
      throw new AppError("Seuls les evenements ouverts peuvent etre clos.", 400);
    }

    const closedEvent = await this.withSerializableTransaction(async (transaction) => {
      const updatedEvent = await transaction.event.update({
        where: {
          id: eventId,
        },
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

      await this.logAdminAction(transaction, adminId, "event_closed", eventId);
      return updatedEvent;
    });

    return serializeAdminEvent(closedEvent);
  }

  private async settleBetsForEvent(
    transaction: Prisma.TransactionClient,
    eventId: string,
    nextLegStatus: BetStatus,
    resolvedOption?: string,
  ) {
    const impactedLegs = await transaction.betLeg.findMany({
      where: {
        eventId,
        status: BetStatus.pending,
      },
      select: {
        id: true,
        betId: true,
        chosenOption: true,
      },
    });

    const impactedBetIds = [...new Set(impactedLegs.map((leg) => leg.betId))];

    for (const leg of impactedLegs) {
      const status =
        nextLegStatus === BetStatus.cancelled
          ? BetStatus.cancelled
          : leg.chosenOption === resolvedOption
            ? BetStatus.won
            : BetStatus.lost;

      await transaction.betLeg.update({
        where: {
          id: leg.id,
        },
        data: {
          status,
        },
      });
    }

    if (impactedBetIds.length === 0) {
      return;
    }

    const impactedBets = await transaction.bet.findMany({
      where: {
        id: {
          in: impactedBetIds,
        },
      },
      include: {
        legs: true,
      },
    });

    for (const bet of impactedBets) {
      const settlement = computeBetSettlement(bet);

      if (!settlement) {
        continue;
      }

      if (settlement.payout > 0) {
        await transaction.user.update({
          where: {
            id: bet.userId,
          },
          data: {
            balance: {
              increment: settlement.payout,
            },
          },
        });
      }

      await transaction.bet.update({
        where: {
          id: bet.id,
        },
        data: {
          status: settlement.status,
          payout: settlement.payout,
          resolvedAt: settlement.resolvedAt,
        },
      });
    }

    await gamificationService.synchronizeManyUserBadges(
      impactedBets.map((bet) => bet.userId),
      transaction,
    );
  }

  async resolveEvent(adminId: string, eventId: string, resolvedOption: string) {
    await this.closeExpiredEvents();

    return this.withSerializableTransaction(async (transaction) => {
      const event = await transaction.event.findUnique({
        where: {
          id: eventId,
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

      if (!event) {
        throw new AppError("Evenement introuvable.", 404);
      }

      if (event.status !== EventStatus.OPEN && event.status !== EventStatus.CLOSED) {
        throw new AppError("Cet evenement ne peut pas etre resolu.", 400);
      }

      const options = normalizeStoredOptions(event.options, event.poolByOption);

      if (!options.some((option) => option.label === resolvedOption)) {
        throw new AppError("Option gagnante invalide.", 400);
      }

      const resolutionDate = new Date();
      const resolvedOptions = options.map((option) => ({
        ...option,
        is_winning: option.label === resolvedOption,
      }));

      const updatedEvent = await transaction.event.update({
        where: {
          id: eventId,
        },
        data: {
          status: EventStatus.RESOLVED,
          resolvedOption,
          resolvedAt: resolutionDate,
          options: toJsonOptions(resolvedOptions),
          validatorId: adminId,
          validatedAt: resolutionDate,
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

      await this.settleBetsForEvent(transaction, eventId, BetStatus.won, resolvedOption);
      await this.logAdminAction(transaction, adminId, "event_resolved", eventId, {
        resolved_option: resolvedOption,
      });
      await gamificationService.synchronizeUserBadges(adminId, transaction);

      return serializeAdminEvent(updatedEvent);
    });
  }

  async cancelEvent(adminId: string, eventId: string) {
    return this.withSerializableTransaction(async (transaction) => {
      const event = await transaction.event.findUnique({
        where: {
          id: eventId,
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

      if (!event) {
        throw new AppError("Evenement introuvable.", 404);
      }

      if (event.status === EventStatus.RESOLVED || event.status === EventStatus.CANCELLED) {
        throw new AppError("Cet evenement ne peut plus etre annule.", 400);
      }

      const options = normalizeStoredOptions(event.options, event.poolByOption).map((option) => ({
        ...option,
        is_winning: null,
      }));

      const updatedEvent = await transaction.event.update({
        where: {
          id: eventId,
        },
        data: {
          status: EventStatus.CANCELLED,
          resolvedAt: new Date(),
          options: toJsonOptions(options),
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

      await this.settleBetsForEvent(transaction, eventId, BetStatus.cancelled);
      await this.logAdminAction(transaction, adminId, "event_cancelled", eventId);
      await gamificationService.synchronizeUserBadges(adminId, transaction);

      return serializeAdminEvent(updatedEvent);
    });
  }

  async createProposal(userId: string, input: CreateProposalInput) {
    const proposal = await prisma.eventProposal.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        category: input.category,
        suggestedDate: input.suggested_date,
      },
      include: {
        user: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            pseudo: true,
            email: true,
          },
        },
      },
    });

    await gamificationService.synchronizeUserBadges(userId);

    return serializeProposal(proposal);
  }

  async listUserProposals(userId: string) {
    const proposals = await prisma.eventProposal.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            pseudo: true,
            email: true,
          },
        },
      },
    });

    return proposals.map((proposal) => serializeProposal(proposal));
  }

  async listAdminProposals(status?: ProposalStatus) {
    const proposals = await prisma.eventProposal.findMany({
      where: status
        ? {
            status,
          }
        : undefined,
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      include: {
        user: {
          select: {
            id: true,
            pseudo: true,
            email: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            pseudo: true,
            email: true,
          },
        },
      },
    });

    return proposals.map((proposal) => serializeProposal(proposal));
  }

  async approveProposal(adminId: string, proposalId: string) {
    const approvedProposal = await this.withSerializableTransaction(async (transaction) => {
      const proposal = await transaction.eventProposal.findUnique({
        where: {
          id: proposalId,
        },
      });

      if (!proposal) {
        throw new AppError("Proposition introuvable.", 404);
      }

      if (proposal.status !== ProposalStatus.PENDING) {
        throw new AppError("Seules les propositions en attente peuvent etre approuvees.", 400);
      }

      const updatedProposal = await transaction.eventProposal.update({
        where: {
          id: proposalId,
        },
        data: {
          status: ProposalStatus.APPROVED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
        include: {
          user: {
            select: {
              id: true,
              pseudo: true,
              email: true,
              avatarUrl: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              pseudo: true,
              email: true,
            },
          },
        },
      });

      await this.logAdminAction(transaction, adminId, "proposal_approved", proposalId);
      return updatedProposal;
    });

    return serializeProposal(approvedProposal);
  }

  async rejectProposal(adminId: string, proposalId: string, input: RejectProposalInput) {
    const rejectedProposal = await this.withSerializableTransaction(async (transaction) => {
      const proposal = await transaction.eventProposal.findUnique({
        where: {
          id: proposalId,
        },
      });

      if (!proposal) {
        throw new AppError("Proposition introuvable.", 404);
      }

      if (proposal.status !== ProposalStatus.PENDING) {
        throw new AppError("Seules les propositions en attente peuvent etre refusees.", 400);
      }

      const updatedProposal = await transaction.eventProposal.update({
        where: {
          id: proposalId,
        },
        data: {
          status: ProposalStatus.REJECTED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: input.reason,
        },
        include: {
          user: {
            select: {
              id: true,
              pseudo: true,
              email: true,
              avatarUrl: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              pseudo: true,
              email: true,
            },
          },
        },
      });

      await this.logAdminAction(transaction, adminId, "proposal_rejected", proposalId, {
        reason: input.reason,
      });
      return updatedProposal;
    });

    return serializeProposal(rejectedProposal);
  }
}

export const eventService = new EventService();
