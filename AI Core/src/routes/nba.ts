import { Router } from 'express';
import { fetchResidentsForBuilding } from '../lib/kasCore.js';
import { getSDURecommendation } from '../lib/claude.js';
import type { NBAOutcome } from '../lib/types.js';

export const nbaRouter = Router();

// In-memory outcome log (replace with DB in production)
const outcomeLog: NBAOutcome[] = [];

// GET /nba/sdu/:unitId?buildingId=xxx
nbaRouter.get('/sdu/:unitId', async (req, res) => {
  const { unitId } = req.params;
  const { buildingId } = req.query as { buildingId?: string };

  if (!buildingId) {
    res.status(400).json({ error: 'buildingId query param required' });
    return;
  }

  try {
    // Fetch all residents in the building (gives us the target + neighbors)
    const residents = await fetchResidentsForBuilding(buildingId);
    const target = residents.find(r => r.unitId === unitId);

    if (!target) {
      res.status(404).json({ error: 'Resident not found' });
      return;
    }

    const neighbors = residents.filter(r => r.unitId !== unitId);

    // Get recent outcomes for this building to inform learning
    const recentOutcomes = outcomeLog
      .filter(o => o.buildingId === buildingId)
      .slice(-20); // last 20 outcomes from same building

    const recommendation = await getSDURecommendation(target, neighbors, recentOutcomes);
    res.json(recommendation);
  } catch (err) {
    console.error('NBA SDU error:', err);
    res.status(500).json({ error: 'Failed to generate recommendation' });
  }
});

// POST /nba/outcome — log what actually happened after a recommendation
nbaRouter.post('/outcome', (req, res) => {
  const outcome: NBAOutcome = {
    ...req.body,
    loggedAt: new Date().toISOString(),
  };
  outcomeLog.push(outcome);
  console.log('NBA outcome logged:', outcome);
  res.json({ ok: true });
});
