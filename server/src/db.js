// Dive More ERP API — data layer (Phase 51).
//
// Two backends, same interface:
//   * PostgreSQL when DATABASE_URL is set (production, per PHASE41).
//   * SQLite (single file, node:sqlite) otherwise — zero-install local
//     server for the office Windows PC. Requires Node 22.5+ (Node 24 LTS
//     recommended). Set SQLITE_PATH to move the database file.
//
// All functions are async so both backends share one call style.

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const ROLES = [
  'owner',
  'admin',
  'finance',
  'accountant',
  'accounting_manager',
  'operations',
  'sales',
];

const usePostgres = Boolean(process.env.DATABASE_URL);

let pool = null; // pg Pool
let sqlite = null; // node:sqlite DatabaseSync

async function initPostgres() {
  const { default: pg } = await import('pg');
  const ssl =
    process.env.PGSSL === 'true'
      ? { rejectUnauthorized: false }
      : undefined;
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
    max: Number(process.env.PG_POOL_MAX || 10),
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function initSqlite() {
  const { DatabaseSync } = await import('node:sqlite');
  const path = process.env.SQLITE_PATH || new URL('../data/divemore.db', import.meta.url).pathname;
  mkdirSync(dirname(path), { recursive: true });
  sqlite = new DatabaseSync(path);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export async function initDb() {
  if (usePostgres) await initPostgres();
  else await initSqlite();
  return usePostgres ? 'postgres' : 'sqlite';
}

export async function dbHealthy() {
  try {
    if (usePostgres) await pool.query('SELECT 1');
    else sqlite.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}

export async function countUsers() {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users');
    return rows[0].n;
  }
  return sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

export async function getUserByEmail(email) {
  if (usePostgres) {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, role, name FROM users WHERE email = $1',
      [email],
    );
    return rows[0] ?? null;
  }
  return (
    sqlite
      .prepare('SELECT id, email, password_hash, role, name FROM users WHERE email = ?')
      .get(email) ?? null
  );
}

export async function createUser({ email, passwordHash, role, name }) {
  if (usePostgres) {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, $3, $4) RETURNING id, email, role, name',
      [email, passwordHash, role, name],
    );
    return rows[0];
  }
  const info = sqlite
    .prepare('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)')
    .run(email, passwordHash, role, name);
  return { id: Number(info.lastInsertRowid), email, role, name };
}

export async function updatePassword(email, passwordHash) {
  if (usePostgres) {
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email]);
    return;
  }
  sqlite.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email);
}

export async function upsertReset({ email, codeHash, expiresAt }) {
  if (usePostgres) {
    await pool.query(
      `INSERT INTO password_resets (email, code_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0`,
      [email, codeHash, expiresAt],
    );
    return;
  }
  sqlite
    .prepare(
      `INSERT INTO password_resets (email, code_hash, expires_at, attempts)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0`,
    )
    .run(email, codeHash, expiresAt);
}

export async function getReset(email) {
  if (usePostgres) {
    const { rows } = await pool.query(
      'SELECT email, code_hash, expires_at, attempts FROM password_resets WHERE email = $1',
      [email],
    );
    return rows[0] ?? null;
  }
  return (
    sqlite
      .prepare('SELECT email, code_hash, expires_at, attempts FROM password_resets WHERE email = ?')
      .get(email) ?? null
  );
}

export async function bumpResetAttempts(email) {
  if (usePostgres) {
    await pool.query('UPDATE password_resets SET attempts = attempts + 1 WHERE email = $1', [email]);
    return;
  }
  sqlite.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE email = ?').run(email);
}

export async function deleteReset(email) {
  if (usePostgres) {
    await pool.query('DELETE FROM password_resets WHERE email = $1', [email]);
    return;
  }
  sqlite.prepare('DELETE FROM password_resets WHERE email = ?').run(email);
}

export async function audit(email, action) {
  try {
    if (usePostgres) {
      await pool.query('INSERT INTO audit_log (email, action) VALUES ($1, $2)', [email, action]);
    } else {
      sqlite.prepare('INSERT INTO audit_log (email, action) VALUES (?, ?)').run(email, action);
    }
  } catch {
    /* audit is best-effort; never fail the request because of it */
  }
}
