import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { config } from '../config';
import { SCHEMA_SQL } from './schema';

const dbPath = resolve(process.cwd(), config.databasePath);
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');
db.exec(SCHEMA_SQL);

/**
 * Runs fn inside a BEGIN IMMEDIATE transaction. IMMEDIATE takes the write
 * lock up front, so under SQLite's single-writer model every read inside the
 * transaction is serialized against concurrent writers — check-then-insert
 * sequences (like the booking conflict check) are race-free.
 */
export function transactionImmediate<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // already rolled back (e.g. by a constraint failure aborting the txn)
    }
    throw err;
  }
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function uuid(): string {
  return crypto.randomUUID();
}
