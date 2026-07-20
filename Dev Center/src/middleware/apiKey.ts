// ── Enkel API-nøkkel for ingest og query-API (POC) ──
import { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.DEVCENTER_API_KEY;

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!API_KEY) {
    next();
    return;
  }

  const provided = req.header('x-api-key');
  if (provided !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
