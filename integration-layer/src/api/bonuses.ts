// ── Bonus-API — nylig beregnede bonuser for Incentive Manager ──
import { Router, Request, Response } from 'express';
import { listBonuses } from '../bonus/BonusLedger.js';

export function createBonusesRouter(): Router {
  const router = Router();

  // GET /bonuses?sellerName=Kari&periodMonth=2026-05&limit=20
  router.get('/', (req: Request, res: Response) => {
    const sellerName = typeof req.query.sellerName === 'string' ? req.query.sellerName : undefined;
    const periodMonth = typeof req.query.periodMonth === 'string' ? req.query.periodMonth : undefined;
    const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;

    const bonuses = listBonuses({
      sellerName,
      periodMonth,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    res.json({ count: bonuses.length, bonuses });
  });

  return router;
}
