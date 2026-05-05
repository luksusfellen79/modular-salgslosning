import express from 'express';
import cors from 'cors';
import { nbaRouter } from './routes/nba.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ai-core' }));
app.use('/nba', nbaRouter);

app.listen(PORT, () => {
  console.log(`AI Core running on port ${PORT}`);
});
