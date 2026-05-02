// ── node-cron job scheduler — monthly commission report trigger ──
import cron from 'node-cron';
import logger from '../logger';

export function setupCronJobs(onMonthlyCommission: () => Promise<void>): void {
  // Kjøres kl 08:00 den 1. i hver måned
  cron.schedule('0 8 1 * *', () => {
    logger.info('cron_monthly_commission_triggered', {});
    onMonthlyCommission().catch((err: Error) => {
      logger.error('cron_monthly_commission_failed', { error: err.message });
    });
  });
  logger.info('cron_jobs_registered', { job: 'monthly-commission', schedule: '0 8 1 * *' });
}
