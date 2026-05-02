// ── Express entry point ──
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Express } from 'express';
import { logger } from './logger';
import { router } from './api/router';

dotenv.config();

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(router);
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? process.env.KASCORE_PORT ?? 3004);
  const app = createApp();

  app.listen(port, () => {
    logger.info('KAS Core Mock service started', { port });
  });
}
