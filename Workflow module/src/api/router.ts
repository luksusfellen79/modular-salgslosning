// ── Express router for internal workflow API endpoints ──
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { WorkflowEngine } from '../workflows/workflow-engine';
import { loadReport, listReports } from '../storage/report-store';
import logger from '../logger';

function getExportsDir(): string {
  return process.env.EXPORTS_DIR ?? path.join(process.cwd(), 'data', 'exports');
}

export function createRouter(engine: WorkflowEngine): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  router.get('/internal/reports', (_req: Request, res: Response) => {
    res.json(listReports());
  });

  router.get('/internal/reports/:reportId', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? uuidv4();
    const report = loadReport(req.params.reportId ?? '');
    if (!report) {
      logger.warn('report_not_found', { correlationId, reportId: req.params.reportId });
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json(report);
  });

  router.post('/internal/trigger/monthly-commission', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? uuidv4();
    try {
      const report = await engine.runMonthlyCommission(correlationId);
      res.status(202).json({ reportId: report.id, period: report.period, status: report.status });
    } catch (err) {
      const error = err as Error;
      logger.error('trigger_monthly_commission_failed', { correlationId, error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/internal/reports/:reportId/approve', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? uuidv4();
    try {
      const report = await engine.approveReport(req.params.reportId ?? '', correlationId);
      res.json({ reportId: report.id, status: report.status });
    } catch (err) {
      const error = err as Error;
      logger.error('approve_report_failed', { correlationId, reportId: req.params.reportId, error: error.message });
      res.status(404).json({ error: error.message });
    }
  });

  router.post('/internal/reports/:reportId/reject', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? uuidv4();
    const { reason } = req.body as { reason?: string };
    if (!reason) {
      res.status(400).json({ error: 'reason is required' });
      return;
    }
    try {
      const report = await engine.rejectReport(req.params.reportId ?? '', reason, correlationId);
      res.json({ reportId: report.id, status: report.status });
    } catch (err) {
      const error = err as Error;
      logger.error('reject_report_failed', { correlationId, reportId: req.params.reportId, error: error.message });
      res.status(404).json({ error: error.message });
    }
  });

  router.get('/internal/exports/:reportId', (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? uuidv4();
    const exportPath = path.join(getExportsDir(), `${req.params.reportId}_PO.json`);
    if (!fs.existsSync(exportPath)) {
      logger.warn('export_not_found', { correlationId, reportId: req.params.reportId });
      res.status(404).json({ error: 'Export not found' });
      return;
    }
    res.json(JSON.parse(fs.readFileSync(exportPath, 'utf-8')));
  });

  return router;
}
