// ── EmailRouter — HTTP-grensesnitt for e-postadapter ──
// POST /adapters/email/send — send e-post via konfigurert provider

import { Router, Request, Response } from 'express';
import { IEmailAdapter } from '../IAdapter.js';

export function createEmailAdapterRouter(adapter: IEmailAdapter): Router {
  const router = Router();

  router.get('/health', async (_req: Request, res: Response) => {
    res.json({
      adapter: adapter.name,
      provider: adapter.provider,
      healthy: await adapter.isHealthy(),
    });
  });

  router.post('/send', async (req: Request, res: Response) => {
    const { to, subject, body, html } = req.body as {
      to?: string;
      subject?: string;
      body?: string;
      html?: string;
    };

    if (!to || !subject || !body) {
      return res.status(400).json({
        error: { code: 'MANGLER_FELT', message: 'to, subject og body er påkrevd' },
      });
    }

    const result = await adapter.sendEmail({ to, subject, body, html });
    const status = result.sent ? 202 : result.skipped ? 200 : 502;
    res.status(status).json(result);
  });

  return router;
}
