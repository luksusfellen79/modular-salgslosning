import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '';

let pool: pg.Pool | null = null;

export function hasDb(): boolean {
  return !!DATABASE_URL && process.env.NODE_ENV !== 'test';
}

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('railway.internal')
        ? false
        : { rejectUnauthorized: false },
      max: 5,
    });
    pool.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[db] uventet pool-feil', err);
    });
  }
  return pool;
}
