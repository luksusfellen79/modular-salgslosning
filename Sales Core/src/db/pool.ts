// ── PostgreSQL connection pool ──
import { Pool } from 'pg';
import { logger } from '../logger';

let pool: Pool | null = null;

export function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL_DISABLE === 'true'
        ? false
        : { rejectUnauthorized: false },
    });
    pool.on('error', (err) => {
      logger.error({ message: 'PostgreSQL pool error', error: err.message });
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
