// ── Service-key for maskin-til-maskin ingest ──
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

const INGEST_KEY = process.env.DEVCENTER_INGEST_KEY;
let warnedOpen = false;

export function requireIngestKey(req: Request, res: Response, next: NextFunction): void {
  if (!INGEST_KEY) {
    if (!warnedOpen && process.env.NODE_ENV !== 'test') {
      warnedOpen = true;
      logger.warn({ message: 'DEVCENTER_INGEST_KEY ikke satt — /ingest er åpen (kun lokal dev)' });
    }
    next();
    return;
  }

  const provided = req.header('x-ingest-key');
  if (provided !== INGEST_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
