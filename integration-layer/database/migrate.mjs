/**
 * Database Migration Script
 * Kjør: node migrate.mjs
 *
 * Krever: DATABASE_PUBLIC_URL som env-var, eller hardkodet under.
 * Installerer pg automatisk hvis nødvendig.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Auto-install pg if missing
try {
  await import('pg');
} catch {
  console.log('Installerer pg...');
  execSync('npm install pg', { stdio: 'inherit' });
}

const { default: pg } = await import('pg');
const { Client } = pg;

const DATABASE_URL =
  process.env.DATABASE_PUBLIC_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:HKUgCclZUwxRRLMkdnzgHzCgkyiLZfag@kodama.proxy.rlwy.net:32179/railway';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Bcrypt-hasher for PINs (generert med bcrypt.hash('0000', 10) og bcrypt.hash('1234', 10))
const HASH_0000 = '$2b$10$rD3Ap6iZlepexPlPhzYO6uEolPuyNJVyNqL717F/uHvoFV.5QyRKi';
const HASH_1234 = '$2b$10$esUnVUicJrDHZANds/A7J.eNbtiN55TjYmrdhvxkRJhP.m9qpE1du';

const SCHEMAS = ['hub.sql', 'sales_core.sql', 'sdu.sql', 'mdu.sql'];

async function runMigration() {
  console.log('=== Modulær Salgsløsning — Database Migration ===\n');
  console.log(`Kobler til: ${DATABASE_URL.replace(/:([^:@]+)@/, ':***@')}`);

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('railway.internal') ? false : { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Tilkoblet\n');
  } catch (err) {
    console.error('✗ Kunne ikke koble til databasen:', err.message);
    process.exit(1);
  }

  for (const file of SCHEMAS) {
    const filePath = join(__dirname, 'schema', file);
    console.log(`Kjører ${file}...`);

    let sql = readFileSync(filePath, 'utf8');
    sql = sql.replace(/PLACEHOLDER_HASH_0000/g, HASH_0000);
    sql = sql.replace(/PLACEHOLDER_HASH_1234/g, HASH_1234);

    try {
      await client.query(sql);
      console.log(`  ✓ ${file} OK`);
    } catch (err) {
      if (
        err.message.includes('already exists') ||
        err.message.includes('duplicate key')
      ) {
        console.log(`  ⚠ ${file}: objekter eksisterer allerede (OK)`);
      } else {
        console.error(`  ✗ ${file} feilet:`, err.message);
        await client.end();
        process.exit(1);
      }
    }
  }

  // Verifiser at tabellene er opprettet
  console.log('\nVerifiserer tabeller...');
  const result = await client.query(`
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname IN ('hub', 'sales_core', 'sdu', 'mdu')
    ORDER BY schemaname, tablename
  `);

  const grouped = {};
  for (const row of result.rows) {
    if (!grouped[row.schemaname]) grouped[row.schemaname] = [];
    grouped[row.schemaname].push(row.tablename);
  }

  for (const [schema, tables] of Object.entries(grouped)) {
    console.log(`  ${schema}: ${tables.join(', ')}`);
  }

  await client.end();
  console.log('\n✓ Migrering fullført!');
}

runMigration();
