import { PrismaClient, type Badge, type Prisma, type User } from "@prisma/client";
import { AppError } from "../utils/app-error";
import { serializeUser } from "../utils/user-serializer";
import { logger } from "../utils/logger";
import {
  buildUnavailableJackpotState,
  isJackpotStorageUnavailable,
  jackpotService,
} from "./jackpot.service";
import { prisma } from "./prisma.service";
import { getBadgeReward, getBadgeRarity, getBadgeVisibility } from "../config/badges.config";

const DAILY_REWARD_BASE = 100;
const MONDAY_REWARD_BASE = 500;

function getDailyBase(date = new Date()) {
  return date.getDay() === 1 ? MONDAY_REWARD_BASE : DAILY_REWARD_BASE;
}
const STREAK_TIERS = [
  { key: "starter", label: "Bronze", minScore: 0, bonus: 0, accent: "cyan" },
  { key: "regular", label: "Argent", minScore: 4, bonus: 25, accent: "sky" },
  { key: "committed", label: "Or", minScore: 12, bonus: 75, accent: "amber" },
  { key: "elite", label: "Lumineux", minScore: 28, bonus: 150, accent: "orange" },
  { key: "legend", label: "Mythique", minScore: 60, bonus: 300, accent: "violet" },
] as const;

const WAGER_COEF_MAX = 2;
const WAGER_COEF_CAP = 100_000;

type BadgeTone = "emerald" | "sky" | "violet" | "amber";
type BadgeRarity = "common" | "rare" | "epic" | "legendary";
type DatabaseClient = PrismaClient | Prisma.TransactionClient;

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "unknown error";
}

interface BadgeStats {
  totalEventBets: number;
  eventWins: number;
  totalCasinoGames: number;
  casinoWins: number;
  createdMarkets: number;
  jackpotEntries: number;
  jackpotContributionTotal: number;
  parlayWins: number;
  chatMessageCount: number;
}

interface BadgeProgress {
  current: number;
  target: number;
  label: string;
}

interface BadgeContext {
  user: User;
  stats: BadgeStats;
}

interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  getProgress: (context: BadgeContext) => BadgeProgress;
}

const RARITY_TONE: Record<BadgeRarity, BadgeTone> = {
  common: "emerald",
  rare: "sky",
  epic: "violet",
  legendary: "amber",
};

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: "first_reward",
    name: "Premier reflexe",
    description: "Première récompense quotidienne récupérée.",
    rarity: "common",
    getProgress: ({ user }) => ({
      current: user.lastRewardAt ? 1 : 0,
      target: 1,
      label: "récompense",
    }),
  },
  {
    key: "streak_3",
    name: "Série en route !",
    description: "Connectez-vous pendant 3 jours consécutifs.",
    rarity: "common",
    getProgress: ({ user }) => ({
      current: Math.min(user.streakDays, 3),
      target: 3,
      label: "jours",
    }),
  },
  {
    key: "streak_7",
    name: "Feu continu",
    description: "Récupérez la récompense quotidienne 7 jours d'affilé",
    rarity: "rare",
    getProgress: ({ user }) => ({
      current: Math.min(user.streakDays, 7),
      target: 7,
      label: "jours",
    }),
  },
  {
    key: "daily_grinder",
    name: "Grinder quotidien",
    description: "30 jours de streak. Vous êtes addicte.",
    rarity: "legendary",
    getProgress: ({ user }) => ({
      current: Math.min(user.streakDays, 30),
      target: 30,
      label: "jours",
    }),
  },
  {
    key: "sharp_bettor",
    name: "Paris en série",
    description: "10 paris d'événements gagnés.",
    rarity: "rare",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.eventWins, 10),
      target: 10,
      label: "victoires",
    }),
  },
  {
    key: "table_hot",
    name: "Table chaude",
    description: "50 victoires en casino confirmées.",
    rarity: "rare",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.casinoWins, 50),
      target: 50,
      label: "victoires",
    }),
  },
  {
    key: "banker_bronze",
    name: "Bankroll bronze",
    description: "Passez la barre des 5000 tokens.",
    rarity: "rare",
    getProgress: ({ user }) => ({
      current: Math.min(user.balance, 5000),
      target: 5000,
      label: "tokens",
    }),
  },
  {
    key: "banker_silver",
    name: "Bankroll argent",
    description: "Passez la barre des 10000 tokens.",
    rarity: "rare",
    getProgress: ({ user }) => ({
      current: Math.min(user.balance, 10000),
      target: 10000,
      label: "tokens",
    }),
  },
  {
    key: "banker_gold",
    name: "Bankroll or",
    description: "Passez la barre des 20000 tokens.",
    rarity: "rare",
    getProgress: ({ user }) => ({
      current: Math.min(user.balance, 20000),
      target: 20000,
      label: "tokens",
    }),
  },
  {
    key: "market_maker",
    name: "Architecte du jeu",
    description: "Premiere proposition de marché publiée / acceptée.",
    rarity: "common",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.createdMarkets, 1),
      target: 1,
      label: "marché",
    }),
  },
  {
    key: "jackpot_hunter",
    name: "Jackpot Hunter",
    description: "250 tokens redirigés vers le jackpot global.",
    rarity: "rare",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.jackpotContributionTotal, 250),
      target: 250,
      label: "tokens",
    }),
  },
  {
    key: "PARLAY_KING",
    name: "Roi des combinés",
    description: "Un pari combiné remporté.",
    rarity: "common",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.parlayWins, 1),
      target: 1,
      label: "parlay gagné",
    }),
  },
  {
    key: "CHAT_ADDICT",
    name: "Chat Addict",
    description: "100 messages envoyés dans le chat. Tu alimentes la communauté.",
    rarity: "common",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.chatMessageCount, 100),
      target: 100,
      label: "messages",
    }),
  },
  {
    key: "COMEBACK_KID",
    name: "Comeback Kid",
    description: "Remonter d'une balance < 100 tokens à > 1000. La résurrection.",
    rarity: "epic",
    getProgress: ({ user }) => ({
      current: user.lowestBalance <= 100 && user.balance > 1000 ? 1 : 0,
      target: 1,
      label: "comeback",
    }),
  },
  {
    key: "ALL_IN",
    name: "All In",
    description: "Tout miser sur un seul pari. Le courage ou la folie, la frontière est fine.",
    rarity: "common",
    getProgress: ({ user }) => ({
      current: user.lowestBalance === 0 ? 1 : 0,
      target: 1,
      label: "all-in",
    }),
  },
  {
    key: "LEADERBOARD_TOP3",
    name: "Podium",
    description: "Apparaître dans le top 3 du leaderboard.",
    rarity: "legendary",
    getProgress: () => ({
      current: 0,
      target: 1,
      label: "top 3",
    }),
  },
];

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getUtcDayDifference(from: Date, to: Date) {
  const diffMs = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

function hasClaimedToday(lastRewardAt: Date | null, now: Date) {
  return lastRewardAt ? getUtcDayDifference(lastRewardAt, now) === 0 : false;
}

function canContinueStreak(lastRewardAt: Date | null, now: Date) {
  return lastRewardAt ? getUtcDayDifference(lastRewardAt, now) === 1 : false;
}

function getWagerCoef(wagered7d: number) {
  return Math.min((wagered7d / WAGER_COEF_CAP) * WAGER_COEF_MAX, WAGER_COEF_MAX);
}

function getRankScore(streakDays: number, wagered7d: number) {
  return streakDays * getWagerCoef(wagered7d);
}

function getStreakBonus(streakDays: number, wagered7d: number) {
  const score = getRankScore(streakDays, wagered7d);
  return STREAK_TIERS.reduce(
    (bonus, tier) => (score >= tier.minScore ? tier.bonus : bonus),
    0,
  );
}

function getCurrentTier(streakDays: number, wagered7d: number) {
  const score = getRankScore(streakDays, wagered7d);
  return STREAK_TIERS.reduce(
    (tier, candidate) => (score >= candidate.minScore ? candidate : tier),
    STREAK_TIERS[0],
  );
}

function getNextTier(streakDays: number, wagered7d: number) {
  const score = getRankScore(streakDays, wagered7d);
  return STREAK_TIERS.find((tier) => tier.minScore > score) ?? null;
}

function isBadgeUnlocked(progress: BadgeProgress) {
  return progress.current >= progress.target;
}

function serializeBadge(badge: Badge) {
  return {
    key: badge.badgeType,
    unlocked_at: badge.unlockedAt.toISOString(),
    claimed_at: badge.claimedAt?.toISOString() ?? null,
  };
}

type LeaderboardScope = "global" | "casino";

interface LeaderboardParticipant {
  userId: string;
  pseudo: string;
  avatarUrl: string | null;
  eventWagered: number;
  casinoWagered: number;
  recentActivityAt: Date | null;
}

function mergeLeaderboardParticipants(
  users: Array<{ id: string; pseudo: string; avatarUrl: string | null }>,
  eventRows: Array<{ userId: string; _sum: { amount: number | null }; _max: { createdAt: Date | null } }>,
  casinoRows: Array<{ userId: string; _sum: { betAmount: number | null }; _max: { createdAt: Date | null } }>,
) {
  const participants = new Map<string, LeaderboardParticipant>();

  for (const user of users) {
    participants.set(user.id, {
      userId: user.id,
      pseudo: user.pseudo,
      avatarUrl: user.avatarUrl,
      eventWagered: 0,
      casinoWagered: 0,
      recentActivityAt: null,
    });
  }

  for (const row of eventRows) {
    const participant = participants.get(row.userId);

    if (!participant) {
      continue;
    }

    participant.eventWagered = row._sum.amount ?? 0;
    participant.recentActivityAt =
      participant.recentActivityAt && row._max.createdAt
        ? participant.recentActivityAt > row._max.createdAt
          ? participant.recentActivityAt
          : row._max.createdAt
        : participant.recentActivityAt ?? row._max.createdAt ?? null;
  }

  for (const row of casinoRows) {
    const participant = participants.get(row.userId);

    if (!participant) {
      continue;
    }

    participant.casinoWagered = row._sum.betAmount ?? 0;
    participant.recentActivityAt =
      participant.recentActivityAt && row._max.createdAt
        ? participant.recentActivityAt > row._max.createdAt
          ? participant.recentActivityAt
          : row._max.createdAt
        : participant.recentActivityAt ?? row._max.createdAt ?? null;
  }

  return [...participants.values()];
}

export class GamificationService {
  private getClient(client?: DatabaseClient) {
    return client ?? prisma;
  }

  private async getWagered7d(userId: string, client?: DatabaseClient): Promise<number> {
    const db = this.getClient(client);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [eventAgg, casinoAgg] = await Promise.all([
      db.bet.aggregate({
        where: { userId, createdAt: { gte: since } },
        _sum: { amount: true },
      }),
      db.casinoGame.aggregate({
        where: { userId, createdAt: { gte: since } },
        _sum: { betAmount: true },
      }),
    ]);

    return (eventAgg._sum.amount ?? 0) + (casinoAgg._sum.betAmount ?? 0);
  }

  private async loadFreshUser(userId: string, client?: DatabaseClient) {
    const db = this.getClient(client);
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isBanned) {
      throw new AppError("Utilisateur introuvable.", 404);
    }

    const now = new Date();

    if (user.lastRewardAt && getUtcDayDifference(user.lastRewardAt, now) > 1 && user.streakDays !== 0) {
      return db.user.update({
        where: { id: userId },
        data: { streakDays: 0 },
      });
    }

    return user;
  }

  private async collectStats(userId: string, client?: DatabaseClient): Promise<BadgeStats> {
    const db = this.getClient(client);
    const [
      totalEventBets,
      eventWins,
      totalCasinoGames,
      casinoWins,
      createdEvents,
      createdProposals,
      parlayWins,
      chatMessageCount,
    ] = await Promise.all([
      db.bet.count({ where: { userId } }),
      db.bet.count({ where: { userId, status: "won" } }),
      db.casinoGame.count({ where: { userId } }),
      db.casinoGame.count({ where: { userId, result: "win" } }),
      db.event.count({ where: { createdById: userId } }),
      db.eventProposal.count({ where: { userId } }),
      db.bet.count({ where: { userId, status: "won", type: "PARLAY" } }),
      db.chatMessage.count({ where: { userId, isSystem: false } }),
    ]);

    let jackpotEntryCount = 0;
    let jackpotContributionAggregate: { _sum: { contributionAmount: number | null } } = {
      _sum: { contributionAmount: 0 },
    };

    try {
      [jackpotEntryCount, jackpotContributionAggregate] = await Promise.all([
        db.jackpotContribution.count({ where: { userId } }),
        db.jackpotContribution.aggregate({
          where: { userId },
          _sum: { contributionAmount: true },
        }),
      ]);
    } catch (error) {
      if (!isJackpotStorageUnavailable(error)) {
        throw error;
      }

      logger.warn(
        `Jackpot stats unavailable during gamification sync; using zeroed jackpot metrics (${getErrorDetails(error)})`,
      );
    }

    return {
      totalEventBets,
      eventWins,
      totalCasinoGames,
      casinoWins,
      createdMarkets: createdEvents + createdProposals,
      jackpotEntries: jackpotEntryCount,
      jackpotContributionTotal: jackpotContributionAggregate._sum.contributionAmount ?? 0,
      parlayWins,
      chatMessageCount,
    };
  }

  private async listBadges(userId: string, user: User, stats: BadgeStats, client?: DatabaseClient) {
    const db = this.getClient(client);
    const unlockedBadges = await db.badge.findMany({
      where: { userId },
      orderBy: { unlockedAt: "desc" },
    });
    const unlockedMap = new Map(unlockedBadges.map((badge) => [badge.badgeType, serializeBadge(badge)]));
    const context = { user, stats };

    return BADGE_DEFINITIONS.map((definition) => {
      const progress = definition.getProgress(context);
      const unlockedBadge = unlockedMap.get(definition.key);
      const catalogRarity = getBadgeRarity(definition.key);
      const reward = getBadgeReward(definition.key);
      const visibility = getBadgeVisibility(definition.key);

      return {
        key: definition.key,
        name: definition.name,
        description: definition.description,
        tone: RARITY_TONE[definition.rarity],
        rarity: definition.rarity,
        catalog_rarity: catalogRarity,
        visibility,
        reward,
        unlocked: !!unlockedBadge || isBadgeUnlocked(progress),
        unlocked_at: unlockedBadge?.unlocked_at ?? null,
        claimed_at: unlockedBadge?.claimed_at ?? null,
        progress,
      };
    });
  }

  private buildRewardState(user: User, wagered7d: number) {
    const now = new Date();
    const claimedToday = hasClaimedToday(user.lastRewardAt, now);
    const streakAlive = !user.lastRewardAt
      || claimedToday
      || canContinueStreak(user.lastRewardAt, now);
    const currentStreak = streakAlive ? user.streakDays : 0;
    const nextStreak = streakAlive ? user.streakDays + (claimedToday ? 1 : 0) : 1;
    const nextClaimAt = new Date(startOfUtcDay(now).getTime() + 24 * 60 * 60 * 1000);
    const streakDeadline = user.lastRewardAt
      ? new Date(startOfUtcDay(user.lastRewardAt).getTime() + 2 * 24 * 60 * 60 * 1000)
      : null;
    const currentTier = getCurrentTier(Math.max(user.streakDays, 1), wagered7d);
    const nextTier = getNextTier(user.streakDays, wagered7d);
    const currentScore = getRankScore(user.streakDays, wagered7d);
    const nextTierGap = nextTier ? nextTier.minScore - currentTier.minScore : 0;
    const progressInTier = nextTier ? Math.max(0, currentScore - currentTier.minScore) : currentScore;

    return {
      day_boundary: "UTC" as const,
      claimed_today: claimedToday,
      current_streak: user.streakDays,
      streak_status: claimedToday
        ? "claimed_today"
        : streakAlive
          ? "claim_available"
          : "broken",
      last_claimed_at: user.lastRewardAt?.toISOString() ?? null,
      next_claim_at: nextClaimAt.toISOString(),
      streak_deadline_at: streakDeadline?.toISOString() ?? null,
      base_amount: getDailyBase(),
      streak_bonus: getStreakBonus(user.streakDays, wagered7d),
      next_amount: getDailyBase() + getStreakBonus(claimedToday ? user.streakDays + 1 : currentStreak + 1, wagered7d),
      next_streak_bonus: getStreakBonus(claimedToday ? user.streakDays + 1 : currentStreak + 1, wagered7d),
      current_tier: currentTier,
      next_tier: nextTier,
      rank_score: Math.round(currentScore * 100) / 100,
      wager_7d: wagered7d,
      wager_coef: Math.round(getWagerCoef(wagered7d) * 100) / 100,
      tier_progress: {
        current: nextTier ? Math.round(Math.max(0, progressInTier) * 100) / 100 : Math.round(currentScore * 100) / 100,
        target: nextTier ? Math.round(nextTierGap * 100) / 100 : Math.round(currentScore * 100) / 100,
      },
    };
  }

  private buildProgress(user: User, stats: BadgeStats, wagered7d: number) {
    const score = getRankScore(user.streakDays, wagered7d);
    const nextTier = getNextTier(user.streakDays, wagered7d);
    const claimedToday = hasClaimedToday(user.lastRewardAt, new Date());

    return [
      {
        key: "daily_claim",
        label: "Récompense du jour",
        current: claimedToday ? 1 : 0,
        target: 1,
        reward: `${getDailyBase()} tokens`,
        completed: claimedToday,
      },
      {
        key: "streak_tier",
        label: "Tier de rang",
        current: nextTier ? Math.round(score * 100) / 100 : STREAK_TIERS.at(-1)?.minScore ?? Math.round(score * 100) / 100,
        target: nextTier?.minScore ?? STREAK_TIERS.at(-1)?.minScore ?? Math.round(score * 100) / 100,
        reward: nextTier ? `${nextTier.label} +${nextTier.bonus}` : "Tier maximal atteint",
        completed: nextTier === null,
      },
      {
        key: "sharp_bettor",
        label: "Paris gagnants",
        current: Math.min(stats.eventWins, 5),
        target: 5,
        reward: "Badge Paris en série",
        completed: stats.eventWins >= 5,
      },
      {
        key: "jackpot_hunter",
        label: "Contribution jackpot",
        current: Math.min(stats.jackpotContributionTotal, 250),
        target: 250,
        reward: "Badge Chasseur de jackpot",
        completed: stats.jackpotContributionTotal >= 250,
      },
    ];
  }

  async synchronizeUserBadges(userId: string, client?: DatabaseClient) {
    const db = this.getClient(client);
    const [user, stats] = await Promise.all([
      this.loadFreshUser(userId, db),
      this.collectStats(userId, db),
    ]);

    const context = { user, stats };
    const unlockedBadgeTypes = BADGE_DEFINITIONS.filter((definition) =>
      isBadgeUnlocked(definition.getProgress(context)),
    ).map((definition) => definition.key);

    if (unlockedBadgeTypes.length > 0) {
      await db.badge.createMany({
        data: unlockedBadgeTypes.map((badgeType) => ({ userId, badgeType })),
        skipDuplicates: true,
      });
    }
  }

  async synchronizeManyUserBadges(userIds: string[], client?: DatabaseClient) {
    const db = this.getClient(client);
    const uniqueUserIds = [...new Set(userIds)];

    for (const userId of uniqueUserIds) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { isBanned: true } });
      if (!user || user.isBanned) continue;

      await this.synchronizeUserBadges(userId, client);
    }
  }

  getBadgeDefinition(key: string) {
    return BADGE_DEFINITIONS.find((badge) => badge.key === key) ?? null;
  }

  listBadgeCatalog() {
    return BADGE_DEFINITIONS.map(({ getProgress: _getProgress, ...badge }) => badge);
  }

  async getState(userId: string, client?: DatabaseClient) {
    const db = this.getClient(client);

    await this.synchronizeUserBadges(userId, db);

    const [user, stats, wagered7d] = await Promise.all([
      this.loadFreshUser(userId, db),
      this.collectStats(userId, db),
      this.getWagered7d(userId, db),
    ]);
    const jackpot = await jackpotService.getState(userId, db).catch((error) => {
      if (!isJackpotStorageUnavailable(error)) {
        throw error;
      }

      logger.warn(
        `Jackpot state unavailable during gamification read; returning fallback state (${getErrorDetails(error)})`,
      );

      return buildUnavailableJackpotState();
    });
    const badges = await this.listBadges(userId, user, stats, db);

    return {
      daily_reward: this.buildRewardState(user, wagered7d),
      badges,
      progress: this.buildProgress(user, stats, wagered7d),
      jackpot,
      stats: {
        event_bets: stats.totalEventBets,
        event_wins: stats.eventWins,
        casino_games: stats.totalCasinoGames,
        casino_wins: stats.casinoWins,
        created_markets: stats.createdMarkets,
        jackpot_entries: stats.jackpotEntries,
        jackpot_tickets: stats.jackpotContributionTotal,
        balance: user.balance,
      },
    };
  }

  async claimDailyReward(userId: string) {
    return prisma.$transaction(async (transaction) => {
      const user = await this.loadFreshUser(userId, transaction);
      const now = new Date();
      const wagered7d = await this.getWagered7d(userId, transaction);

      if (hasClaimedToday(user.lastRewardAt, now)) {
        return {
          claimed: false,
          amount: 0,
          base_amount: getDailyBase(now),
          streak_bonus: 0,
          user: serializeUser(user),
          gamification: await this.getState(userId, transaction),
        };
      }

      const nextStreak = canContinueStreak(user.lastRewardAt, now) ? user.streakDays + 1 : 1;
      const streakBonus = getStreakBonus(nextStreak, wagered7d);
      const dailyBase = getDailyBase(now);
      const amount = dailyBase + streakBonus;

      const updatedUser = await transaction.user.update({
        where: { id: userId },
        data: {
          balance: { increment: amount },
          lastRewardAt: now,
          streakDays: nextStreak,
        },
      });

      await this.synchronizeUserBadges(userId, transaction);

      return {
        claimed: true,
        amount,
        base_amount: dailyBase,
        streak_bonus: streakBonus,
        user: serializeUser(updatedUser),
        gamification: await this.getState(userId, transaction),
      };
    });
  }

  async getLeaderboard(
    userId: string,
    input?: {
      scope?: LeaderboardScope;
      limit?: number;
    },
  ) {
    const scope = input?.scope ?? "global";
    const limit = Math.min(Math.max(input?.limit ?? 10, 1), 50);
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [eventRows, casinoRows] = await Promise.all([
      prisma.bet.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: since },
          user: { isBanned: false },
        },
        _sum: { amount: true },
        _max: { createdAt: true },
      }),
      prisma.casinoGame.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: since },
          user: { isBanned: false },
        },
        _sum: { betAmount: true },
        _max: { createdAt: true },
      }),
    ]);

    const participantIds = [...new Set([
      ...eventRows.map((row) => row.userId),
      ...casinoRows.map((row) => row.userId),
      userId,
    ])];

    const users = await prisma.user.findMany({
      where: {
        id: { in: participantIds },
        isBanned: false,
      },
      select: {
        id: true,
        pseudo: true,
        avatarUrl: true,
      },
    });

    const participants = mergeLeaderboardParticipants(users, eventRows, casinoRows)
      .map((participant) => {
        const totalWagered =
          scope === "casino"
            ? participant.casinoWagered
            : participant.eventWagered + participant.casinoWagered;

        return {
          ...participant,
          totalWagered,
        };
      })
      .filter((participant) => participant.totalWagered > 0 || participant.userId === userId)
      .sort((left, right) => {
        if (right.totalWagered !== left.totalWagered) {
          return right.totalWagered - left.totalWagered;
        }

        const leftActivity = left.recentActivityAt?.getTime() ?? 0;
        const rightActivity = right.recentActivityAt?.getTime() ?? 0;

        if (rightActivity !== leftActivity) {
          return rightActivity - leftActivity;
        }

        return left.pseudo.localeCompare(right.pseudo, "fr");
      });

    const ranked = participants.map((participant, index) => ({
      rank: index + 1,
      user: {
        id: participant.userId,
        pseudo: participant.pseudo,
        avatar_url: participant.avatarUrl,
      },
      total_wagered: participant.totalWagered,
      casino_wagered: participant.casinoWagered,
      event_wagered: participant.eventWagered,
      recent_activity_at: participant.recentActivityAt?.toISOString() ?? null,
      is_current_user: participant.userId === userId,
    }));

    const currentUserEntry = ranked.find((entry) => entry.is_current_user) ?? null;

    return {
      scope,
      window_days: 60,
      limit,
      total_ranked_users: ranked.filter((entry) => entry.total_wagered > 0).length,
      entries: ranked.slice(0, limit),
      current_user_entry: currentUserEntry,
    };
  }

  async updateLowestBalanceOnDebit(userId: string, newBalance: number, client?: DatabaseClient) {
    const db = this.getClient(client);
    await db.user.update({
      where: { id: userId },
      data: { lowestBalance: { set: newBalance } },
    });
  }

  // Called after a debit to track lowest balance for COMEBACK_KID
  async trackDebit(userId: string, newBalance: number, client?: DatabaseClient) {
    const db = this.getClient(client);
    const user = await db.user.findUnique({ where: { id: userId }, select: { lowestBalance: true } });
    if (!user) return;
    if (newBalance < user.lowestBalance) {
      await db.user.update({
        where: { id: userId },
        data: { lowestBalance: newBalance },
      });
    }
  }

  async triggerAllIn(userId: string, client?: DatabaseClient) {
    const db = this.getClient(client);
    await db.badge.createMany({
      data: [{ userId, badgeType: "ALL_IN" }],
      skipDuplicates: true,
    });
  }

  async triggerLeaderboardTop3(userId: string, client?: DatabaseClient) {
    const db = this.getClient(client);
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [eventRows, casinoRows] = await Promise.all([
      db.bet.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since }, user: { isBanned: false } },
        _sum: { amount: true },
      }),
      db.casinoGame.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: since }, user: { isBanned: false } },
        _sum: { betAmount: true },
      }),
    ]);

    const wageredByUser = new Map<string, number>();
    for (const row of eventRows) {
      wageredByUser.set(row.userId, (wageredByUser.get(row.userId) ?? 0) + (row._sum.amount ?? 0));
    }
    for (const row of casinoRows) {
      wageredByUser.set(row.userId, (wageredByUser.get(row.userId) ?? 0) + (row._sum.betAmount ?? 0));
    }

    const userTotal = wageredByUser.get(userId) ?? 0;
    if (userTotal === 0) return;

    const higherCount = [...wageredByUser.values()].filter((v) => v > userTotal).length;
    const rank = higherCount + 1;

    if (rank <= 3) {
      await db.badge.createMany({
        data: [{ userId, badgeType: "LEADERBOARD_TOP3" }],
        skipDuplicates: true,
      });
    }
  }

  async claimBadgeReward(userId: string, badgeType: string) {
    return prisma.$transaction(async (transaction) => {
      const badge = await transaction.badge.findUnique({
        where: { userId_badgeType: { userId, badgeType } },
      });

      if (!badge) {
        throw new AppError("Badge non débloqué.", 404);
      }

      if (badge.claimedAt !== null) {
        throw new AppError("Récompense déjà réclamée.", 409);
      }

      const reward = getBadgeReward(badgeType);
      const now = new Date();

      const [, updatedUser] = await Promise.all([
        transaction.badge.update({
          where: { userId_badgeType: { userId, badgeType } },
          data: { claimedAt: now },
        }),
        transaction.user.update({
          where: { id: userId },
          data: { balance: { increment: reward } },
        }),
      ]);

      return {
        reward,
        newBalance: updatedUser.balance,
      };
    });
  }
}

export const gamificationService = new GamificationService();
