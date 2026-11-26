// Dive More ERP — central API server (Phase 51, own server like v20).
//
// Implements exactly the contract the frontend expects in API mode
// (src/auth.ts):
//   GET  /api/health
//   POST /api/auth/login           { email, password }        -> { token, user }
//   POST /api/auth/forgot-password { email }                  -> always 200
//   POST /api/auth/reset-password  { email, token, newPassword }
//   POST /api/auth/change-password { email, currentPassword, newPassword } + Bearer JWT
//   POST /api/auth/users           { email, password, role, name } + Bearer JWT (owner/admin)
//
// Passwords are bcrypt-hashed, sessions are JWTs (PHASE41 design).
// Database: PostgreSQL when DATABASE_URL is set, SQLite file otherwise.
//
// Run:  npm install && npm start        (see PHASE51_OWN_API_SERVER.md)

import { createHash, randomInt, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';

import {
  ROLES,
  audit,
  bumpResetAttempts,
  countUsers,
  createUser,
  dbHealthy,
  deleteReset,
  getReset,
  getUserByEmail,
  initDb,
  updatePassword,
  upsertReset,
} from './db.js';

const PORT = Number(process.env.API_PORT || process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const BCRYPT_COST = 12;
const RESET_TTL_MS = 30 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;
const TOKEN_TTL = '12h';

let jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
  jwtSecret = randomUUID() + randomUUID();
  console.warn(
    '[warn] JWT_SECRET is not set — using a temporary secret. ' +
      'Sessions will end when the server restarts. Set JWT_SECRET (32+ random chars) in production.',
  );
}

const normalizeEmail = (raw) => String(raw ?? '').trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function passwordError(password) {
  if (typeof password !== 'string' || password.length < 8) return 'password_too_short';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'password_needs_letter_and_digit';
  return null;
}

const sha256Hex = (text) => createHash('sha256').update(text).digest('hex');
const resetCodeHash = (email, code) => sha256Hex(`${email}::${code}`);

// Compared against when the account does not exist, so login timing does
// not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('divemore-dummy-password', BCRYPT_COST);

function signToken(user) {
  return jwt.sign({ sub: user.email, role: user.role }, jwtSecret, { expiresIn: TOKEN_TTL });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
    req.auth = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
}

// --- Reset-code delivery -------------------------------------------------
// If SMTP_* env vars are set, the code is emailed. Otherwise it is written
// to server/data/reset-outbox.log and printed to the server console, so the
// office admin can read it and pass it to the staff member. Configure SMTP
// for real email delivery (see PHASE51_OWN_API_SERVER.md).
async function deliverResetCode(email, code) {
  const line = `${new Date().toISOString()}  ${email}  code=${code}\n`;
  try {
    const outboxPath =
      process.env.RESET_OUTBOX_PATH ||
      fileURLToPath(new URL('../data/reset-outbox.log', import.meta.url));
    mkdirSync(dirname(outboxPath), { recursive: true });
    appendFileSync(outboxPath, line);
  } catch {
    /* outbox is best-effort */
  }
  console.log(`[password-reset] code for ${email}: ${code} (valid 30 minutes)`);

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const { default: nodemailer } = await import('nodemailer');
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Dive More ERP — password reset code',
        text: `Your Dive More ERP password reset code is: ${code}\nIt expires in 30 minutes. If you did not request it, ignore this email.`,
      });
    } catch (err) {
      console.error(`[password-reset] email delivery failed for ${email}: ${err.message}`);
    }
  }
}

// --- App -----------------------------------------------------------------

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

const corsOrigins = (process.env.CORS_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) return cb(null, true);
      return cb(null, false);
    },
  }),
);

// Lightweight login rate limit: 20 attempts / 5 minutes / IP.
const loginHits = new Map();
function loginRateLimited(ip) {
  const now = Date.now();
  const hits = (loginHits.get(ip) || []).filter((t) => now - t < 5 * 60 * 1000);
  hits.push(now);
  loginHits.set(ip, hits);
  return hits.length > 20;
}

app.get('/api/health', async (_req, res) => {
  const ok = await dbHealthy();
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'error', database: ok ? 'connected' : 'down' });
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? '');
  if (!isValidEmail(email) || !password) return res.status(400).json({ error: 'invalid_request' });
  if (loginRateLimited(req.ip)) return res.status(429).json({ error: 'too_many_attempts' });

  const user = await getUserByEmail(email);
  const ok = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
  if (!user || !ok) {
    await audit(email, 'login_failed');
    return res.status(401).json({ error: 'wrong_credentials' });
  }
  await audit(email, 'login_success');
  return res.json({
    token: signToken(user),
    user: { email: user.email, role: user.role, name: user.name || user.email },
  });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  // Always the same answer, whether or not the account exists.
  res.json({ ok: true });
  if (!isValidEmail(email)) return;
  const user = await getUserByEmail(email);
  if (!user) return;
  const code = String(randomInt(100000, 1000000));
  await upsertReset({ email, codeHash: resetCodeHash(email, code), expiresAt: Date.now() + RESET_TTL_MS });
  await audit(email, 'password_reset_requested');
  await deliverResetCode(email, code);
});

app.post('/api/auth/reset-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.token ?? '').trim();
  const newPassword = String(req.body?.newPassword ?? '');
  if (!isValidEmail(email) || !code) return res.status(400).json({ error: 'invalid_request' });
  const pwErr = passwordError(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const record = await getReset(email);
  if (!record) return res.status(400).json({ error: 'reset_no_record' });
  if (Date.now() > Number(record.expires_at)) {
    await deleteReset(email);
    return res.status(400).json({ error: 'reset_expired' });
  }
  if (Number(record.attempts) >= RESET_MAX_ATTEMPTS) {
    return res.status(400).json({ error: 'reset_too_many_attempts' });
  }
  if (resetCodeHash(email, code) !== record.code_hash) {
    await bumpResetAttempts(email);
    return res.status(400).json({ error: 'reset_mismatch' });
  }
  const user = await getUserByEmail(email);
  if (!user) return res.status(400).json({ error: 'reset_no_record' });

  await updatePassword(email, await bcrypt.hash(newPassword, BCRYPT_COST));
  await deleteReset(email);
  await audit(email, 'password_reset_completed');
  return res.json({ ok: true });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const currentPassword = String(req.body?.currentPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');
  if (req.auth.sub !== email) return res.status(403).json({ error: 'email_mismatch' });
  if (!currentPassword) return res.status(400).json({ error: 'password_required' });
  if (newPassword === currentPassword) return res.status(400).json({ error: 'password_unchanged' });
  const pwErr = passwordError(newPassword);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const user = await getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'wrong_credentials' });
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'wrong_credentials' });

  await updatePassword(email, await bcrypt.hash(newPassword, BCRYPT_COST));
  await audit(email, 'password_changed');
  return res.json({ ok: true });
});

app.post('/api/auth/users', requireAuth, async (req, res) => {
  if (!['owner', 'admin'].includes(req.auth.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? '');
  const role = String(req.body?.role ?? 'sales');
  const name = String(req.body?.name ?? '').trim();
  if (!isValidEmail(email)) return res.status(400).json({ error: 'invalid_email' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'invalid_role' });
  const pwErr = passwordError(password);
  if (pwErr) return res.status(400).json({ error: pwErr });
  if (await getUserByEmail(email)) return res.status(409).json({ error: 'email_taken' });

  const created = await createUser({
    email,
    passwordHash: await bcrypt.hash(password, BCRYPT_COST),
    role,
    name,
  });
  await audit(req.auth.sub, `user_created:${email}`);
  return res.status(201).json({ user: { email: created.email, role: created.role, name: created.name } });
});

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// --- Bootstrap + start -----------------------------------------------------

async function bootstrapAdmin() {
  const email = normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL || '');
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Dive More Administrator';
  if ((await countUsers()) > 0) return;
  if (!email || !password) {
    console.warn(
      '[warn] No users exist yet. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD ' +
        'and restart, or create the first user with: npm run create-user -- owner@example.com "A-Strong-Password1" owner "Your Name"',
    );
    return;
  }
  const pwErr = passwordError(password);
  if (pwErr) {
    console.error(`[error] BOOTSTRAP_ADMIN_PASSWORD rejected: ${pwErr}. Fix it and restart.`);
    return;
  }
  await createUser({ email, passwordHash: await bcrypt.hash(password, BCRYPT_COST), role: 'owner', name });
  await audit(email, 'bootstrap_owner_created');
  console.log(`[bootstrap] owner account created for ${email}`);
}

const backend = await initDb();
await bootstrapAdmin();
app.listen(PORT, HOST, () => {
  console.log(`Dive More ERP API listening on http://${HOST}:${PORT} (database: ${backend})`);
  console.log(`Health check: http://127.0.0.1:${PORT}/api/health`);
});
