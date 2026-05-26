// ── Case Service API router ──
import express, { Request, Response } from 'express';
import { listCases, getCaseById } from '../db/caseRepository';
import { listCaseEvents } from '../db/eventRepository';
import { listCaseTypes, listRoutingRules } from '../db/typeRepository';
import {
  addComment,
  assignCase,
  closeCase,
  createCase,
  escalateCase,
  reopenCase,
  resolveCase,
  startCase,
  takeCase,
} from '../services/caseService';
import { useMemoryStore, usePostgres } from '../db/pool';
import { SakPrioritet, SakStatus } from '../types';
import { logger } from '../logger';

export const router = express.Router();
router.use(express.json());

function actorFromRequest(req: Request) {
  return {
    brukerId: (req.body?.brukerId ?? req.headers['x-bruker-id']) as string | undefined,
    brukerNavn: (req.body?.brukerNavn ?? req.headers['x-bruker-navn']) as string | undefined,
  };
}

function handleError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'Unknown error';
  if (message.includes('not found') || message.includes('ikke funnet')) {
    res.status(404).json({ error: message });
    return;
  }
  if (message.includes('Ukjent casetype') || message.includes('required') || message.includes('Kun lukkede')) {
    res.status(400).json({ error: message });
    return;
  }
  logger.error({ message: 'API error', error: message });
  res.status(500).json({ error: message });
}

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    storage: usePostgres() ? 'postgresql' : useMemoryStore() ? 'memory' : 'unconfigured',
  });
});

router.get('/api/typer', async (_req: Request, res: Response) => {
  try {
    const typer = await listCaseTypes();
    res.json(typer);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/api/rutingregler', async (_req: Request, res: Response) => {
  try {
    const regler = await listRoutingRules();
    res.json(regler);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/api/cases', async (req: Request, res: Response) => {
  try {
    const result = await listCases({
      status: req.query.status as SakStatus | undefined,
      gruppe: req.query.gruppe as string | undefined,
      typeKode: req.query.typeKode as string | undefined,
      tildeltBrukerId: req.query.tildeltBrukerId as string | undefined,
      q: req.query.q as string | undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
      offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/api/queue/:gruppe', async (req: Request, res: Response) => {
  try {
    const result = await listCases({
      gruppe: req.params.gruppe,
      status: (req.query.status as SakStatus | undefined) ?? undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

/** @deprecated Bruk /api/queue/:gruppe */
router.get('/api/cases/kø/:gruppe', async (req: Request, res: Response) => {
  try {
    const result = await listCases({
      gruppe: req.params.gruppe,
      status: (req.query.status as SakStatus | undefined) ?? undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/api/cases/:id', async (req: Request, res: Response) => {
  try {
    const caseItem = await getCaseById(req.params.id);
    if (!caseItem) return res.status(404).json({ error: 'Case not found' });
    res.json(caseItem);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/api/cases/:id/hendelser', async (req: Request, res: Response) => {
  try {
    const caseItem = await getCaseById(req.params.id);
    if (!caseItem) return res.status(404).json({ error: 'Case not found' });
    const hendelser = await listCaseEvents(caseItem.id);
    res.json(hendelser);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      typeKode?: string;
      tittel?: string;
      beskrivelse?: string;
      prioritet?: SakPrioritet;
      kundeId?: string;
      kundeNavn?: string;
      kundeEpost?: string;
      kundeTelefon?: string;
      bestillerId?: string;
      opprettetAv?: string;
      opprettetAvNavn?: string;
      kilde?: string;
      kildeRef?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.typeKode || !body.tittel) {
      return res.status(400).json({ error: 'typeKode og tittel er påkrevd' });
    }

    const created = await createCase({
      typeKode: body.typeKode,
      tittel: body.tittel,
      beskrivelse: body.beskrivelse,
      prioritet: body.prioritet,
      kundeId: body.kundeId,
      kundeNavn: body.kundeNavn,
      kundeEpost: body.kundeEpost,
      kundeTelefon: body.kundeTelefon,
      bestillerId: body.bestillerId,
      opprettetAv: body.opprettetAv,
      opprettetAvNavn: body.opprettetAvNavn,
      kilde: body.kilde ?? 'api',
      kildeRef: body.kildeRef,
      metadata: body.metadata,
    });

    res.status(201).json(created);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases/:id/assign', async (req: Request, res: Response) => {
  try {
    const { gruppe, brukerId, brukerNavn } = req.body as { gruppe?: string; brukerId?: string; brukerNavn?: string };
    const updated = await assignCase(req.params.id, { gruppe, brukerId, brukerNavn }, actorFromRequest(req));
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases/:id/take', async (req: Request, res: Response) => {
  try {
    const updated = await takeCase(req.params.id, actorFromRequest(req));
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases/:id/start', async (req: Request, res: Response) => {
  try {
    const updated = await startCase(req.params.id, actorFromRequest(req));
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { kommentar } = req.body as { kommentar?: string };
    const updated = await resolveCase(req.params.id, actorFromRequest(req), kommentar);
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases/:id/close', async (req: Request, res: Response) => {
  try {
    const { kommentar } = req.body as { kommentar?: string };
    const updated = await closeCase(req.params.id, actorFromRequest(req), kommentar);
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases/:id/reopen', async (req: Request, res: Response) => {
  try {
    const { grunn, kommentar } = req.body as { grunn?: string; kommentar?: string };
    if (!grunn) return res.status(400).json({ error: 'grunn er påkrevd' });
    const updated = await reopenCase(req.params.id, actorFromRequest(req), grunn, kommentar);
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases/:id/escalate', async (req: Request, res: Response) => {
  try {
    const { kommentar, malgruppe } = req.body as { kommentar?: string; malgruppe?: string };
    const updated = await escalateCase(req.params.id, actorFromRequest(req), { kommentar, malgruppe });
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/api/cases/:id/kommentarer', async (req: Request, res: Response) => {
  try {
    const { tekst } = req.body as { tekst?: string };
    if (!tekst) return res.status(400).json({ error: 'tekst er påkrevd' });
    const updated = await addComment(req.params.id, actorFromRequest(req), tekst);
    res.json(updated);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/cases', async (req: Request, res: Response) => {
  try {
    const body = req.body as { typeKode?: string; tittel?: string; beskrivelse?: string; prioritet?: SakPrioritet;
      kundeId?: string; kundeNavn?: string; kundeEpost?: string; kundeTelefon?: string; bestillerId?: string;
      opprettetAv?: string; opprettetAvNavn?: string; kilde?: string; kildeRef?: string; metadata?: Record<string, unknown> };
    if (!body.typeKode || !body.tittel) {
      return res.status(400).json({ error: 'typeKode og tittel er påkrevd' });
    }
    const created = await createCase({ ...body, typeKode: body.typeKode, tittel: body.tittel, kilde: body.kilde ?? 'api' });
    res.status(201).json(created);
  } catch (err) {
    handleError(res, err);
  }
});
