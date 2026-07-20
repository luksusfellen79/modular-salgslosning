// ── SQLite-lag for Dev Center ──
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'devcenter.db');

if (DB_PATH !== ':memory:') {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    ts            INTEGER NOT NULL,
    service       TEXT    NOT NULL,
    type          TEXT    NOT NULL,
    method        TEXT,
    path          TEXT,
    status        INTEGER,
    duration_ms   INTEGER,
    correlation_id TEXT,
    message       TEXT,
    stack         TEXT,
    request_body  TEXT,
    meta          TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_logs_ts      ON logs (ts);
  CREATE INDEX IF NOT EXISTS idx_logs_corr    ON logs (correlation_id);
  CREATE INDEX IF NOT EXISTS idx_logs_service ON logs (service, ts);

  CREATE TABLE IF NOT EXISTS alerts (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    ts       INTEGER NOT NULL,
    service  TEXT    NOT NULL,
    rule     TEXT    NOT NULL,
    message  TEXT    NOT NULL,
    resolved_ts INTEGER
  );

  CREATE TABLE IF NOT EXISTS health_checks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         INTEGER NOT NULL,
    service    TEXT    NOT NULL,
    ok         INTEGER NOT NULL,
    status_code INTEGER,
    latency_ms INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_health_service ON health_checks (service, ts);
`);

export interface LogEntry {
  ts: number;
  service: string;
  type: 'request' | 'error';
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  correlationId?: string;
  message?: string;
  stack?: string;
  requestBody?: string;
  meta?: string;
}

const insertLogStmt = db.prepare(`
  INSERT INTO logs (ts, service, type, method, path, status, duration_ms, correlation_id, message, stack, request_body, meta)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export function insertLogs(entries: LogEntry[]): void {
  db.exec('BEGIN');
  try {
    for (const e of entries) {
      insertLogStmt.run(
        e.ts,
        e.service,
        e.type,
        e.method ?? null,
        e.path ?? null,
        e.status ?? null,
        e.durationMs ?? null,
        e.correlationId ?? null,
        e.message ?? null,
        e.stack ?? null,
        e.requestBody ?? null,
        e.meta ?? null,
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS ?? '14', 10);

export function pruneOldData(): void {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare('DELETE FROM logs WHERE ts < ?').run(cutoff);
  db.prepare('DELETE FROM health_checks WHERE ts < ?').run(cutoff);
  db.prepare('DELETE FROM alerts WHERE ts < ?').run(cutoff);
}

/** Kun for tester — tømmer alle tabeller. */
export function clearAllData(): void {
  db.exec('DELETE FROM logs');
  db.exec('DELETE FROM alerts');
  db.exec('DELETE FROM health_checks');
}
