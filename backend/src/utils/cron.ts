import cron from 'node-cron';
import { prisma } from '../services/prisma.service';
import { gamificationService } from '../services/gamification.service';
import { logger } from './logger';
import * as robinHoodService from '../services/robin-hood.service';

const LEADERBOARD_TABS = ['balance', 'volume', 'winrate_global', 'winrate_casino'] as const;

async function takeLeaderboardSnapshots(): Promise<void> {
  const now = new Date();
  const purgeOlderThan = new Date(now.getTime() - 25 * 60 * 60 * 1000);

  for (const tab of LEADERBOARD_TABS) {
    try {
      const rankings = await gamificationService.computeRankingsForSnapshot(tab);
      await prisma.leaderboardSnapshot.create({
        data: { tab, rankings },
      });
      const purged = await prisma.leaderboardSnapshot.deleteMany({
        where: { tab, takenAt: { lt: purgeOlderThan } },
      });
      logger.info(`[CRON] Snapshot leaderboard tab=${tab}: ${rankings.length} rangs, ${purged.count} anciens supprimés`);
    } catch (err) {
      logger.error(`[CRON] Erreur snapshot leaderboard tab=${tab}`, { error: err });
    }
  }
}

export function startCronJobs(): void {
  // Tous les jours à 02h00 — purge OddsHistory
  cron.schedule('0 2 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await prisma.oddsHistory.deleteMany({
        where: {
          event: {
            status: { in: ['RESOLVED', 'CANCELLED'] },
            resolvedAt: { lt: cutoff },
          },
        },
      });
      logger.info(`[CRON] OddsHistory purge: ${result.count} lignes supprimées`);
    } catch (err) {
      logger.error('[CRON] Erreur purge OddsHistory', { error: err });
    }
  });

  // Toutes les heures — snapshot des 4 classements
  cron.schedule('0 * * * *', async () => {
    await takeLeaderboardSnapshots();
  });

  // Lundi 00:00 — Création du vote Robin des Slots
  cron.schedule('0 0 * * 1', async () => {
    try {
      await robinHoodService.createWeeklyEvent();
      logger.info('[CRON] Robin des Slots: vote créé');
    } catch (err) {
      logger.error('[CRON] Robin des Slots: erreur création vote', { error: err });
    }
  });

  // Lundi 10:00 — Clôture du vote, activation
  cron.schedule('0 10 * * 1', async () => {
    try {
      const event = await robinHoodService.getCurrentEvent();
      if (event?.status === 'VOTE') {
        await robinHoodService.closeVoteAndActivate(event.id);
        logger.info('[CRON] Robin des Slots: vote clôturé, événement activé');
      }
    } catch (err) {
      logger.error('[CRON] Robin des Slots: erreur clôture vote', { error: err });
    }
  });

  // Lundi 23:59 — Clôture de l'événement
  cron.schedule('59 23 * * 1', async () => {
    try {
      const event = await robinHoodService.getCurrentEvent();
      if (event?.status === 'ACTIVE') {
        await robinHoodService.closeEvent(event.id);
        logger.info('[CRON] Robin des Slots: événement clôturé');
      }
    } catch (err) {
      logger.error('[CRON] Robin des Slots: erreur clôture événement', { error: err });
    }
  });

  logger.info('[CRON] Jobs démarrés (purge OddsHistory à 02h00, snapshots leaderboard toutes les heures, Robin des Slots lundi)');
}
