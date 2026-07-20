// ── Express entry point ──
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { logger } from './logger';
import { router } from './api/router';
import { initDevCenter, requestLogger, errorReporter } from './devcenter';

dotenv.config();
initDevCenter('kas-core');

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(requestLogger());
  app.use(router);
  app.use(errorReporter());
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? process.env.KASCORE_PORT ?? 3004);
  const app = createApp();

  app.listen(port, () => {
    logger.info('KAS Core Mock service started', { port });
  });
}
