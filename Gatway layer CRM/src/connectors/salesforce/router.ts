import { Router, Request, Response } from 'express';
import { accessControl } from '../../gateway/auth';
import { SalesforceConnector } from './index';
import { sfGet, sfPost, sfPatch, sfDelete, sfQuery } from './restApi';
import { logger, logRequest } from '../../gateway/logger';

const router = Router();
const connector = new SalesforceConnector();

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', async (_req, res) => {
  res.json(await connector.health());
});

// ── Capabilities ──────────────────────────────────────────────────────────────
router.get('/capabilities', (_req, res) => {
  res.json({ connectorId: connector.connectorId, capabilities: connector.capabilities() });
});

// ── SOQL-spørring ─────────────────────────────────────────────────────────────
router.get('/query', accessControl('salesforce', 'read'), async (req: Request, res: Response) => {
  const start = Date.now();
  const { q } = req.query;
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Mangler SOQL-spørring: ?q=SELECT...' });

  try {
    const data = await sfQuery(q, req.correlationId!);
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: 'sf.query', durationMs: Date.now() - start, status: 'success' });
    res.json(data);
  } catch (err: any) {
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: 'sf.query', durationMs: Date.now() - start, status: 'error', errorCode: err.code });
    res.status(502).json({ error: err });
  }
});

// ── Les ett objekt ────────────────────────────────────────────────────────────
router.get('/objects/:sobject/:id', accessControl('salesforce', 'read'), async (req: Request, res: Response) => {
  const start = Date.now();
  const { sobject, id } = req.params;
  try {
    const data = await sfGet(`/sobjects/${sobject}/${id}`, req.correlationId!);
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: `sf.${sobject}.read`, durationMs: Date.now() - start, status: 'success' });
    res.json(data);
  } catch (err: any) {
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: `sf.${sobject}.read`, durationMs: Date.now() - start, status: 'error', errorCode: err.code });
    res.status(err.retryable ? 503 : 502).json({ error: err });
  }
});

// ── Opprett objekt ────────────────────────────────────────────────────────────
router.post('/objects/:sobject', accessControl('salesforce', 'write'), async (req: Request, res: Response) => {
  const start = Date.now();
  const { sobject } = req.params;
  try {
    const data = await sfPost(`/sobjects/${sobject}`, req.body, req.correlationId!);
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: `sf.${sobject}.create`, durationMs: Date.now() - start, status: 'success' });
    res.status(201).json(data);
  } catch (err: any) {
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: `sf.${sobject}.create`, durationMs: Date.now() - start, status: 'error', errorCode: err.code });
    res.status(502).json({ error: err });
  }
});

// ── Oppdater objekt ───────────────────────────────────────────────────────────
router.patch('/objects/:sobject/:id', accessControl('salesforce', 'write'), async (req: Request, res: Response) => {
  const start = Date.now();
  const { sobject, id } = req.params;
  try {
    await sfPatch(`/sobjects/${sobject}/${id}`, req.body, req.correlationId!);
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: `sf.${sobject}.update`, durationMs: Date.now() - start, status: 'success' });
    res.status(204).send();
  } catch (err: any) {
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: `sf.${sobject}.update`, durationMs: Date.now() - start, status: 'error', errorCode: err.code });
    res.status(502).json({ error: err });
  }
});

// ── Slett objekt ──────────────────────────────────────────────────────────────
router.delete('/objects/:sobject/:id', accessControl('salesforce', 'write'), async (req: Request, res: Response) => {
  const start = Date.now();
  const { sobject, id } = req.params;
  try {
    await sfDelete(`/sobjects/${sobject}/${id}`, req.correlationId!);
    logRequest({ correlationId: req.correlationId!, callerService: req.serviceId!, operation: `sf.${sobject}.delete`, durationMs: Date.now() - start, status: 'success' });
    res.status(204).send();
  } catch (err: any) {
    res.status(502).json({ error: err });
  }
});

export default router;
