// ── Bull queue for tracking commission report approval ──
import Bull from 'bull';
import logger from '../logger';

let _queue: Bull.Queue | null = null;

export function getApprovalQueue(): Bull.Queue {
  if (!_queue) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    _queue = new Bull('approval-queue', redisUrl);
    _queue.on('error', (err: Error) => {
      logger.error('approval_queue_error', { error: err.message });
    });
    logger.info('approval_queue_initialized', { redisUrl });
  }
  return _queue;
}

export async function enqueueForApproval(reportId: string, period: string): Promise<void> {
  const q = getApprovalQueue();
  await q.add({ reportId, period }, { attempts: 3, backoff: 5000 });
  logger.info('report_enqueued_for_approval', { reportId, period });
}
