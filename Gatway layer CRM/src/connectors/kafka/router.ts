import { Router, Request, Response } from 'express';
import { accessControl } from '../../gateway/auth';
import { KafkaConnector, kafka, publishMessage } from './index';

const router = Router();
const connector = new KafkaConnector();

router.get('/health', async (_req, res) => {
  res.json(await connector.health());
});

router.get('/capabilities', (_req, res) => {
  res.json({ connectorId: connector.connectorId, capabilities: connector.capabilities() });
});

// ── List topics (autoriserte) ─────────────────────────────────────────────────
router.get('/topics', accessControl('kafka', 'consume'), async (req: Request, res: Response) => {
  try {
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    await admin.disconnect();
    res.json({ topics });
  } catch (err: any) {
    res.status(502).json({ error: { code: 'KAFKA_LIST_ERROR', message: err.message, correlationId: req.correlationId, timestamp: new Date().toISOString(), retryable: true } });
  }
});

// ── Publiser melding ──────────────────────────────────────────────────────────
router.post('/topics/:topic/messages', accessControl('kafka', 'produce'), async (req: Request, res: Response) => {
  const { topic } = req.params;
  const { key, value } = req.body;
  if (!value) return res.status(400).json({ error: 'Mangler value i body' });

  try {
    await publishMessage(topic, key || null, value);
    res.status(202).json({ published: true, topic });
  } catch (err: any) {
    res.status(502).json({ error: { code: 'KAFKA_PUBLISH_ERROR', message: err.message, correlationId: req.correlationId, timestamp: new Date().toISOString(), retryable: true } });
  }
});

export default router;
