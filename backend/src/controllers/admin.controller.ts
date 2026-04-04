import type { RequestHandler } from "express";
import { prisma } from "../services/prisma.service";

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return (volume / 1_000_000).toFixed(1) + "M";
  }
  if (volume >= 1_000) {
    return (volume / 1_000).toFixed(1) + "K";
  }
  return volume.toString();
}

export const getStatisticsOverview: RequestHandler = async (_request, response, next) => {
  try {
    const now = new Date();

    // Start of current ISO week (Monday)
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentWeekStart = new Date(now);
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(now.getDate() - daysToMonday);

    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7);

    const [currentWeekBets, previousWeekBets, totalUsers, volumeResult] =
      await Promise.all([
        prisma.bet.count({
          where: { createdAt: { gte: currentWeekStart } },
        }),
        prisma.bet.count({
          where: { createdAt: { gte: previousWeekStart, lt: currentWeekStart } },
        }),
        prisma.user.count(),
        prisma.bet.aggregate({ _sum: { amount: true } }),
      ]);

    const percentageChange =
      previousWeekBets > 0
        ? ((currentWeekBets - previousWeekBets) / previousWeekBets) * 100
        : 0;

    const totalVolume = volumeResult._sum.amount ?? 0;

    response.json({
      totalBets: {
        value: currentWeekBets,
        percentageChange: Math.round(percentageChange),
        trend: percentageChange >= 0 ? "up" : "down",
      },
      activeUsers: {
        total: totalUsers,
        online: 0,
      },
      totalVolume: {
        value: totalVolume,
        formatted: formatVolume(totalVolume),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEventsLeaderboard: RequestHandler = async (_request, response, next) => {
  try {
    // Group bets by event, order by total volume descending
    const betGroups = await prisma.bet.groupBy({
      by: ["eventId"],
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
      where: { eventId: { not: null } },
    });

    if (betGroups.length === 0) {
      response.json({ leaderboard: [] });
      return;
    }

    const eventIds = betGroups.map((g) => g.eventId as string);
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true },
    });

    const eventMap = new Map(events.map((e) => [e.id, e]));

    const leaderboard = betGroups.map((group, index) => {
      const event = eventMap.get(group.eventId as string);
      return {
        rank: index + 1,
        eventId: group.eventId,
        title: event?.title ?? "Événement supprimé",
        totalVolume: group._sum.amount ?? 0,
        betCount: group._count.id,
      };
    });

    response.json({ leaderboard });
  } catch (error) {
    next(error);
  }
};
