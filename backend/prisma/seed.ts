import {
  BetStatus,
  BetType,
  CasinoGameResult,
  CasinoGameType,
  EventStatus,
  Prisma,
  PrismaClient,
  ProposalStatus,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

const now = Date.now();

interface SeedOption {
  label: string;
  initial_odds: number;
  current_odds: number;
  total_staked: number;
  is_winning: boolean | null;
}

interface EventSeed {
  title: string;
  description: string;
  status: EventStatus;
  options: readonly SeedOption[];
  closingAt: Date;
  minBet: number;
  maxBet: number;
  excludedUserEmails: readonly string[];
  resolvedAt?: Date;
  resolvedOption?: string;
}

const userSeeds = [
  {
    email: "admin@epita.fr",
    pseudo: "HouseMaster",
    role: UserRole.admin,
    balance: 5400,
    microsoftId: "seed-admin",
    streakDays: 12,
    lastRewardAt: new Date(now - 4 * 60 * 60 * 1000),
  },
  {
    email: "validator@epita.fr",
    pseudo: "OddsGuardian",
    role: UserRole.validator,
    balance: 3100,
    microsoftId: "seed-validator",
    streakDays: 4,
    lastRewardAt: new Date(now - 12 * 60 * 60 * 1000),
  },
  {
    email: "student@epita.fr",
    pseudo: "SigmaStudent",
    role: UserRole.user,
    balance: 2285,
    microsoftId: "seed-student",
    streakDays: 6,
    lastRewardAt: new Date(now - 6 * 60 * 60 * 1000),
  },
  {
    email: "excluded@epita.fr",
    pseudo: "BenchWarmer",
    role: UserRole.user,
    balance: 1750,
    microsoftId: "seed-excluded",
    streakDays: 1,
    lastRewardAt: new Date(now - 30 * 60 * 60 * 1000),
  },
  {
    email: "streaker@epita.fr",
    pseudo: "DailyGrinder",
    role: UserRole.user,
    balance: 2875,
    microsoftId: "seed-streaker",
    streakDays: 14,
    lastRewardAt: new Date(now - 2 * 60 * 60 * 1000),
  },
] as const;

const eventSeeds: readonly EventSeed[] = [
  {
    title: "Qui finira top 1 du mini leaderboard cette semaine ?",
    description: "Evenement ouvert avec pari simple deja place pour valider le dashboard.",
    status: EventStatus.OPEN,
    options: [
      { label: "Les grinders du matin", initial_odds: 1.78, current_odds: 1.64, total_staked: 180, is_winning: null },
      { label: "Les night owls", initial_odds: 2.12, current_odds: 2.36, total_staked: 70, is_winning: null },
    ],
    closingAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
    minBet: 10,
    maxBet: 300,
    excludedUserEmails: [] as string[],
  },
  {
    title: "Finale Champions League 2026",
    description: "Evenement sport ouvert avec utilisateur exclu pour tester les protections.",
    status: EventStatus.OPEN,
    options: [
      { label: "Equipe A", initial_odds: 1.92, current_odds: 1.88, total_staked: 120, is_winning: null },
      { label: "Equipe B", initial_odds: 1.97, current_odds: 2.04, total_staked: 95, is_winning: null },
    ],
    closingAt: new Date(now + 6 * 24 * 60 * 60 * 1000),
    minBet: 20,
    maxBet: 400,
    excludedUserEmails: ["excluded@epita.fr"],
  },
  {
    title: "Quel projet de promo fera le plus parler cette semaine ?",
    description: "Evenement ferme en attente de resolution pour le workflow admin.",
    status: EventStatus.CLOSED,
    options: [
      { label: "Projet IA", initial_odds: 2.22, current_odds: 2.08, total_staked: 230, is_winning: null },
      { label: "Projet Web", initial_odds: 2.54, current_odds: 2.62, total_staked: 180, is_winning: null },
      { label: "Projet Secu", initial_odds: 3.2, current_odds: 3.18, total_staked: 90, is_winning: null },
    ],
    closingAt: new Date(now - 4 * 60 * 60 * 1000),
    minBet: 10,
    maxBet: 250,
    excludedUserEmails: [] as string[],
  },
  {
    title: "Quel club remportera le hackathon SIGambLing ?",
    description: "Evenement resolu avec gains credites pour verifier les regressions de settlement.",
    status: EventStatus.RESOLVED,
    options: [
      { label: "Club IA", initial_odds: 2.05, current_odds: 1.86, total_staked: 260, is_winning: true },
      { label: "Club Web", initial_odds: 2.1, current_odds: 2.48, total_staked: 150, is_winning: false },
    ],
    closingAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
    resolvedAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
    resolvedOption: "Club IA",
    minBet: 20,
    maxBet: 500,
    excludedUserEmails: [] as string[],
  },
] as const;

function buildPoolByOption(
  options: ReadonlyArray<{
    label: string;
    total_staked: number;
  }>,
) {
  return options.reduce<Record<string, number>>((accumulator, option) => {
    accumulator[option.label] = option.total_staked;
    return accumulator;
  }, {});
}

function toJsonOptions(options: ReadonlyArray<SeedOption>): Prisma.InputJsonArray {
  return options.map((option) => ({
    label: option.label,
    initial_odds: option.initial_odds,
    current_odds: option.current_odds,
    total_staked: option.total_staked,
    is_winning: option.is_winning,
  })) as Prisma.InputJsonArray;
}

async function main() {
  const users = new Map<string, Awaited<ReturnType<typeof prisma.user.upsert>>>();

  for (const userSeed of userSeeds) {
    const user = await prisma.user.upsert({
      where: { email: userSeed.email },
      update: {
        pseudo: userSeed.pseudo,
        role: userSeed.role,
        balance: userSeed.balance,
        microsoftId: userSeed.microsoftId,
        streakDays: userSeed.streakDays,
        lastRewardAt: userSeed.lastRewardAt,
        isBanned: false,
      },
      create: {
        email: userSeed.email,
        pseudo: userSeed.pseudo,
        role: userSeed.role,
        balance: userSeed.balance,
        microsoftId: userSeed.microsoftId,
        streakDays: userSeed.streakDays,
        lastRewardAt: userSeed.lastRewardAt,
      },
    });

    users.set(userSeed.email, user);
  }

  const admin = users.get("admin@epita.fr");
  const validator = users.get("validator@epita.fr");
  const student = users.get("student@epita.fr");
  const excluded = users.get("excluded@epita.fr");
  const streaker = users.get("streaker@epita.fr");

  if (!admin || !validator || !student || !excluded || !streaker) {
    throw new Error("Seed users could not be initialized.");
  }

  const events = new Map<string, Awaited<ReturnType<typeof prisma.event.upsert>>>();

  for (const eventSeed of eventSeeds) {
    const excludedUsers = eventSeed.excludedUserEmails
      .map((email) => users.get(email))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    const poolByOption = buildPoolByOption(eventSeed.options);
    const totalPool = eventSeed.options.reduce((sum, option) => sum + option.total_staked, 0);

    const event = await prisma.event.upsert({
      where: { title: eventSeed.title },
      update: {
        description: eventSeed.description,
        status: eventSeed.status,
        options: toJsonOptions(eventSeed.options),
        poolByOption,
        totalPool,
        closingAt: eventSeed.closingAt,
        resolvedAt: eventSeed.resolvedAt ?? null,
        resolvedOption: eventSeed.resolvedOption ?? null,
        minBet: eventSeed.minBet,
        maxBet: eventSeed.maxBet,
        createdById: admin.id,
        validatorId: eventSeed.status === EventStatus.RESOLVED ? validator.id : null,
        validatedAt: eventSeed.status === EventStatus.RESOLVED ? eventSeed.resolvedAt ?? new Date() : null,
      },
      create: {
        title: eventSeed.title,
        description: eventSeed.description,
        status: eventSeed.status,
        options: toJsonOptions(eventSeed.options),
        poolByOption,
        totalPool,
        closingAt: eventSeed.closingAt,
        resolvedAt: eventSeed.resolvedAt ?? null,
        resolvedOption: eventSeed.resolvedOption ?? null,
        minBet: eventSeed.minBet,
        maxBet: eventSeed.maxBet,
        createdById: admin.id,
        validatorId: eventSeed.status === EventStatus.RESOLVED ? validator.id : null,
        validatedAt: eventSeed.status === EventStatus.RESOLVED ? eventSeed.resolvedAt ?? new Date() : null,
      },
    });

    await prisma.eventExclusion.deleteMany({
      where: { eventId: event.id },
    });

    if (excludedUsers.length > 0) {
      await prisma.eventExclusion.createMany({
        data: excludedUsers.map((user) => ({
          eventId: event.id,
          userId: user.id,
        })),
      });
    }

    await prisma.oddsHistory.deleteMany({
      where: { eventId: event.id },
    });

    await prisma.oddsHistory.createMany({
      data: eventSeed.options.map((option, index) => ({
        eventId: event.id,
        option: option.label,
        odds: option.current_odds,
        totalStaked: option.total_staked,
        timestamp: new Date(now - (index + 1) * 60 * 60 * 1000),
      })),
    });

    events.set(eventSeed.title, event);
  }

  await prisma.betLeg.deleteMany({
    where: {
      bet: {
        userId: {
          in: [student.id, streaker.id],
        },
      },
    },
  });

  await prisma.bet.deleteMany({
    where: {
      userId: {
        in: [student.id, streaker.id],
      },
    },
  });

  const leaderboardEvent = events.get("Qui finira top 1 du mini leaderboard cette semaine ?");
  const sportsEvent = events.get("Finale Champions League 2026");
  const resolvedEvent = events.get("Quel club remportera le hackathon SIGambLing ?");

  if (!leaderboardEvent || !sportsEvent || !resolvedEvent) {
    throw new Error("Seed events could not be initialized.");
  }

  await prisma.bet.create({
    data: {
      userId: student.id,
      eventId: leaderboardEvent.id,
      chosenOption: "Les grinders du matin",
      amount: 70,
      oddAtBet: 1.64,
      type: BetType.SIMPLE,
      status: BetStatus.pending,
      potentialWin: 114,
      payout: 0,
      legs: {
        create: {
          eventId: leaderboardEvent.id,
          chosenOption: "Les grinders du matin",
          oddsAtBet: 1.64,
          status: BetStatus.pending,
        },
      },
    },
  });

  await prisma.bet.create({
    data: {
      userId: student.id,
      eventId: resolvedEvent.id,
      chosenOption: "Club IA",
      amount: 120,
      oddAtBet: 1.86,
      type: BetType.SIMPLE,
      status: BetStatus.won,
      potentialWin: 223,
      payout: 223,
      resolvedAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      legs: {
        create: {
          eventId: resolvedEvent.id,
          chosenOption: "Club IA",
          oddsAtBet: 1.86,
          status: BetStatus.won,
        },
      },
    },
  });

  await prisma.bet.create({
    data: {
      userId: streaker.id,
      amount: 45,
      oddAtBet: 3.8432,
      type: BetType.PARLAY,
      status: BetStatus.pending,
      potentialWin: 172,
      payout: 0,
      legs: {
        create: [
          {
            eventId: leaderboardEvent.id,
            chosenOption: "Les grinders du matin",
            oddsAtBet: 1.64,
            status: BetStatus.pending,
          },
          {
            eventId: sportsEvent.id,
            chosenOption: "Equipe A",
            oddsAtBet: 2.3434,
            status: BetStatus.pending,
          },
        ],
      },
    },
  });

  await prisma.badge.deleteMany({
    where: {
      userId: {
        in: [student.id, streaker.id],
      },
    },
  });

  await prisma.badge.createMany({
    data: [
      { userId: student.id, badgeType: "first_bet" },
      { userId: student.id, badgeType: "casino_hot_hand" },
      { userId: streaker.id, badgeType: "daily_streak_7" },
      { userId: streaker.id, badgeType: "parlay_builder" },
    ],
  });

  await prisma.casinoGame.deleteMany({
    where: {
      userId: {
        in: [student.id, streaker.id],
      },
    },
  });

  await prisma.casinoGame.createMany({
    data: [
      {
        userId: student.id,
        gameType: CasinoGameType.roulette,
        betAmount: 30,
        result: CasinoGameResult.win,
        payout: 30,
        gameData: {
          result_number: 7,
          result_color: "red",
          winning_bets: ["red"],
        },
      },
      {
        userId: streaker.id,
        gameType: CasinoGameType.blackjack,
        betAmount: 40,
        result: CasinoGameResult.win,
        payout: 40,
        gameData: {
          result: "blackjack",
          player_total: 21,
          dealer_total: 19,
        },
      },
    ],
  });

  await prisma.eventProposal.upsert({
    where: { id: "3c2b8a60-f3d2-4e1b-93e2-0d2f4a5d1001" },
    update: {
      title: "Resultat partiel ALGO > 15/20 ?",
      description: "Je pense que la moyenne sera surprenamment haute cette annee.",
      suggestedDate: new Date(now + 8 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.PENDING,
      reviewedById: null,
      reviewedAt: null,
      rejectionReason: null,
      userId: student.id,
    },
    create: {
      id: "3c2b8a60-f3d2-4e1b-93e2-0d2f4a5d1001",
      userId: student.id,
      title: "Resultat partiel ALGO > 15/20 ?",
      description: "Je pense que la moyenne sera surprenamment haute cette annee.",
      suggestedDate: new Date(now + 8 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.PENDING,
    },
  });

  await prisma.eventProposal.upsert({
    where: { id: "5c6b8a60-f3d2-4e1b-93e2-0d2f4a5d1002" },
    update: {
      title: "La roulette sortira-t-elle deux fois noir de suite au prochain live ?",
      description: "Proposition approuvee pour la demo casino.",
      suggestedDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.APPROVED,
      reviewedById: admin.id,
      reviewedAt: new Date(now - 24 * 60 * 60 * 1000),
      rejectionReason: null,
      userId: streaker.id,
    },
    create: {
      id: "5c6b8a60-f3d2-4e1b-93e2-0d2f4a5d1002",
      userId: streaker.id,
      title: "La roulette sortira-t-elle deux fois noir de suite au prochain live ?",
      description: "Proposition approuvee pour la demo casino.",
      suggestedDate: new Date(now + 2 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.APPROVED,
      reviewedById: admin.id,
      reviewedAt: new Date(now - 24 * 60 * 60 * 1000),
    },
  });

  await prisma.siteConfig.upsert({
    where: { key: "maintenanceMode" },
    update: {},
    create: { key: "maintenanceMode", value: "false" },
  });

  await prisma.siteConfig.upsert({
    where: { key: "rouletteDisabled" },
    update: {},
    create: { key: "rouletteDisabled", value: "false" },
  });

  await prisma.siteConfig.upsert({
    where: { key: "blackjackDisabled" },
    update: {},
    create: { key: "blackjackDisabled", value: "false" },
  });

  await prisma.siteConfig.upsert({
    where: { key: "eventsDisabled" },
    update: {},
    create: { key: "eventsDisabled", value: "false" },
  });

  await prisma.eventProposal.upsert({
    where: { id: "7d6b8a60-f3d2-4e1b-93e2-0d2f4a5d1003" },
    update: {
      title: "Le serveur tombera-t-il pendant la soutenance ?",
      description: "Cas de rejet pour valider le panneau admin.",
      suggestedDate: new Date(now + 9 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.REJECTED,
      reviewedById: validator.id,
      reviewedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      rejectionReason: "Question non conforme a la charte de moderation.",
      userId: excluded.id,
    },
    create: {
      id: "7d6b8a60-f3d2-4e1b-93e2-0d2f4a5d1003",
      userId: excluded.id,
      title: "Le serveur tombera-t-il pendant la soutenance ?",
      description: "Cas de rejet pour valider le panneau admin.",
      suggestedDate: new Date(now + 9 * 24 * 60 * 60 * 1000),
      status: ProposalStatus.REJECTED,
      reviewedById: validator.id,
      reviewedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      rejectionReason: "Question non conforme a la charte de moderation.",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
