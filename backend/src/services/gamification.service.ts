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

const DAILY_REWARD_BASE = 100;
const STREAK_TIERS = [
  { key: "starter", label: "Bronze", minDays: 1, bonus: 0, accent: "cyan" },
  { key: "regular", label: "Argent", minDays: 3, bonus: 25, accent: "sky" },
  { key: "committed", label: "Or", minDays: 7, bonus: 75, accent: "amber" },
  { key: "elite", label: "Lumineux", minDays: 14, bonus: 150, accent: "orange" },
  { key: "legend", label: "Mythique", minDays: 30, bonus: 300, accent: "violet" },
] as const;

type BadgeTone = "cyan" | "orange" | "emerald" | "violet" | "amber" | "sky";
type BadgeRarity = "common" | "rare" | "epic";
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
  lockedDescription: string;
  tone: BadgeTone;
  rarity: BadgeRarity;
  icon: string;
  getProgress: (context: BadgeContext) => BadgeProgress;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    key: "first_reward",
    name: "Premier reflexe",
    description: "Première récompense quotidienne confirmée.",
    lockedDescription: "Récupérez votre première récompense du jour.",
    tone: "cyan",
    rarity: "common",
    icon: "gift",
    getProgress: ({ user }) => ({
      current: user.lastRewardAt ? 1 : 0,
      target: 1,
      label: "récompense",
    }),
  },
  {
    key: "streak_3",
    name: "Série en route",
    description: "Série de 3 jours validée.",
    lockedDescription: "Tenez 3 jours d'affilée pour déverrouiller ce badge.",
    tone: "orange",
    rarity: "common",
    icon: "flame",
    getProgress: ({ user }) => ({
      current: Math.min(user.streakDays, 3),
      target: 3,
      label: "jours",
    }),
  },
  {
    key: "streak_7",
    name: "Feu continu",
    description: "Série de 7 jours sans casser le rythme.",
    lockedDescription: "Gardez la streak vivante jusqu'au palier 7 jours.",
    tone: "orange",
    rarity: "rare",
    icon: "zap",
    getProgress: ({ user }) => ({
      current: Math.min(user.streakDays, 7),
      target: 7,
      label: "jours",
    }),
  },
  {
    key: "daily_grinder",
    name: "Grinder quotidien",
    description: "30 jours de streak. Rien ne vous sort de la boucle.",
    lockedDescription: "Atteignez 30 jours de streak pour passer mythique.",
    tone: "violet",
    rarity: "epic",
    icon: "crown",
    getProgress: ({ user }) => ({
      current: Math.min(user.streakDays, 30),
      target: 30,
      label: "jours",
    }),
  },
  {
    key: "sharp_bettor",
    name: "Paris en série",
    description: "5 paris d'événements gagnés.",
    lockedDescription: "Accumulez 5 victoires sur les marchés.",
    tone: "emerald",
    rarity: "rare",
    icon: "target",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.eventWins, 5),
      target: 5,
      label: "victoires",
    }),
  },
  {
    key: "table_hot",
    name: "Table chaude",
    description: "5 victoires en casino confirmées.",
    lockedDescription: "Gagnez 5 manches au casino.",
    tone: "violet",
    rarity: "rare",
    icon: "dice-3",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.casinoWins, 5),
      target: 5,
      label: "victoires",
    }),
  },
  {
    key: "banker_bronze",
    name: "Bankroll solide",
    description: "Passez la barre des 5 000 tokens.",
    lockedDescription: "Montez votre bankroll jusqu'à 5 000 tokens.",
    tone: "amber",
    rarity: "epic",
    icon: "coins",
    getProgress: ({ user }) => ({
      current: Math.min(user.balance, 5000),
      target: 5000,
      label: "tokens",
    }),
  },
  {
    key: "market_maker",
    name: "Architecte du jeu",
    description: "Premier marché ou première proposition publiée.",
    lockedDescription: "Créez ou proposez un marché pour rejoindre la liste.",
    tone: "sky",
    rarity: "common",
    icon: "layout-grid",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.createdMarkets, 1),
      target: 1,
      label: "marché",
    }),
  },
  {
    key: "jackpot_hunter",
    name: "Chasseur de jackpot",
    description: "250 tokens redirigés vers le jackpot permanent.",
    lockedDescription: "Alimentez le jackpot avec 250 tokens de contributions cumulées.",
    tone: "cyan",
    rarity: "rare",
    icon: "ticket",
    getProgress: ({ stats }) => ({
      current: Math.min(stats.jackpotContributionTotal, 250),
      target: 250,
      label: "tokens",
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

function getStreakBonus(streakDays: number) {
  return STREAK_TIERS.reduce(
    (bonus, tier) => (streakDays >= tier.minDays ? tier.bonus : bonus),
    0,
  );
}

function getCurrentTier(streakDays: number) {
  return STREAK_TIERS.reduce(
    (tier, candidate) => (streakDays >= candidate.minDays ? candidate : tier),
    STREAK_TIERS[0],
  );
}

function getNextTier(streakDays: number) {
  return STREAK_TIERS.find((tier) => tier.minDays > streakDays) ?? null;
}

function isBadgeUnlocked(progress: BadgeProgress) {
  return progress.current >= progress.target;
}

function serializeBadge(badge: Badge) {
  return {
    key: badge.badgeType,
    unlocked_at: badge.unlockedAt.toISOString(),
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
    ] = await Promise.all([
      db.bet.count({ where: { userId } }),
      db.bet.count({ where: { userId, status: "won" } }),
      db.casinoGame.count({ where: { userId } }),
      db.casinoGame.count({ where: { userId, result: "win" } }),
      db.event.count({ where: { createdById: userId } }),
      db.eventProposal.count({ where: { userId } }),
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

      return {
        key: definition.key,
        name: definition.name,
        description: unlockedBadge ? definition.description : definition.lockedDescription,
        tone: definition.tone,
        rarity: definition.rarity,
        icon: definition.icon,
        unlocked: isBadgeUnlocked(progress),
        unlocked_at: unlockedBadge?.unlocked_at ?? null,
        progress,
      };
    });
  }

  private buildRewardState(user: User) {
    const now = new Date();
    const claimedToday = hasClaimedToday(user.lastRewardAt, now);
    const streakAlive = user.lastRewardAt
      ? claimedToday || canContinueStreak(user.lastRewardAt, now)
      : false;
    const currentStreak = streakAlive ? user.streakDays : 0;
    const nextStreak = streakAlive ? user.streakDays + (claimedToday ? 1 : 0) : 1;
    const nextClaimAt = new Date(startOfUtcDay(now).getTime() + 24 * 60 * 60 * 1000);
    const streakDeadline = user.lastRewardAt
      ? new Date(startOfUtcDay(user.lastRewardAt).getTime() + 2 * 24 * 60 * 60 * 1000)
      : null;
    const currentTier = getCurrentTier(Math.max(user.streakDays, 1));
    const nextTier = getNextTier(user.streakDays);
    const daysIntoTier = user.streakDays - currentTier.minDays;
    const daysNeededInTier = nextTier ? nextTier.minDays - currentTier.minDays : 0;

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
      base_amount: DAILY_REWARD_BASE,
      streak_bonus: getStreakBonus(user.streakDays),
      next_amount: DAILY_REWARD_BASE + getStreakBonus(claimedToday ? user.streakDays + 1 : currentStreak || 1),
      next_streak_bonus: getStreakBonus(claimedToday ? user.streakDays + 1 : currentStreak || 1),
      current_tier: currentTier,
      next_tier: nextTier,
      tier_progress: {
        current: nextTier ? Math.max(0, daysIntoTier) : user.streakDays,
        target: nextTier ? daysNeededInTier : user.streakDays,
      },
    };
  }

  private buildProgress(user: User, stats: BadgeStats) {
    const nextTier = getNextTier(user.streakDays);
    const claimedToday = hasClaimedToday(user.lastRewardAt, new Date());

    return [
      {
        key: "daily_claim",
        label: "Récompense du jour",
        current: claimedToday ? 1 : 0,
        target: 1,
        reward: `${DAILY_REWARD_BASE} tokens`,
        completed: claimedToday,
      },
      {
        key: "streak_tier",
        label: "Tier de streak",
        current: nextTier ? user.streakDays : STREAK_TIERS.at(-1)?.minDays ?? user.streakDays,
        target: nextTier?.minDays ?? STREAK_TIERS.at(-1)?.minDays ?? user.streakDays,
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
    const uniqueUserIds = [...new Set(userIds)];

    for (const userId of uniqueUserIds) {
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

    const [user, stats] = await Promise.all([
      this.loadFreshUser(userId, db),
      this.collectStats(userId, db),
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
      daily_reward: this.buildRewardState(user),
      badges,
      progress: this.buildProgress(user, stats),
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

      if (hasClaimedToday(user.lastRewardAt, now)) {
        return {
          claimed: false,
          amount: 0,
          base_amount: DAILY_REWARD_BASE,
          streak_bonus: 0,
          user: serializeUser(user),
          gamification: await this.getState(userId, transaction),
        };
      }

      const nextStreak = canContinueStreak(user.lastRewardAt, now) ? user.streakDays + 1 : 1;
      const streakBonus = getStreakBonus(nextStreak);
      const amount = DAILY_REWARD_BASE + streakBonus;

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
        base_amount: DAILY_REWARD_BASE,
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
}

export const gamificationService = new GamificationService();
