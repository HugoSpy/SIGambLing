import cron from 'node-cron';
import { prisma } from '../services/prisma.service';
import { logger } from './logger';

export function startCronJobs(): void {
  // Tous les jours à 02h00
  cron.schedule('0 2 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // J-1

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

  logger.info('[CRON] Jobs démarrés (purge OddsHistory à 02h00)');
}
