// Integration test for the Dive More ERP API server (Phase 51).
// Spawns the real server with a temporary SQLite database and runs the
// full auth cycle the frontend uses: login, create user, forgot/reset,
// change password. Run with: npm test (from server/ or repo root).

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const PORT = 18987;
const BASE = `http://127.0.0.1:${PORT}`;
const tmp = mkdtempSync(join(tmpdir(), 'divemore-api-test-'));
const outbox = join(tmp, 'reset-outbox.log');

const OWNER = { email: 'owner@divemore.test', password: 'OwnerPass1' };
const STAFF = { email: 'sales@divemore.test', password: 'SalesPass1' };

let server;

async function api(path, { method = 'POST', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function waitForHealth() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not become healthy');
}

test.before(async () => {
  server = spawn(process.execPath, ['src/index.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: {
      ...process.env,
      API_PORT: String(PORT),
      HOST: '127.0.0.1',
      DATABASE_URL: '',
      SQLITE_PATH: join(tmp, 'test.db'),
      RESET_OUTBOX_PATH: outbox,
      JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
      BOOTSTRAP_ADMIN_EMAIL: OWNER.email,
      BOOTSTRAP_ADMIN_PASSWORD: OWNER.password,
      BOOTSTRAP_ADMIN_NAME: 'Test Owner',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForHealth();
});

test.after(() => {
  server?.kill('SIGTERM');
});

test('health endpoint reports ok + database connected', async () => {
  const { status, data } = await api('/api/health', { method: 'GET' });
  assert.equal(status, 200);
  assert.equal(data.status, 'ok');
  assert.equal(data.database, 'connected');
});

test('bootstrap owner can log in and gets a JWT + owner role', async () => {
  const { status, data } = await api('/api/auth/login', { body: OWNER });
  assert.equal(status, 200);
  assert.ok(data.token);
  assert.equal(data.user.email, OWNER.email);
  assert.equal(data.user.role, 'owner');
  assert.equal(data.user.name, 'Test Owner');
});

test('wrong password and unknown email both return 401', async () => {
  const wrong = await api('/api/auth/login', { body: { email: OWNER.email, password: 'WrongPass1' } });
  assert.equal(wrong.status, 401);
  const unknown = await api('/api/auth/login', { body: { email: 'nobody@divemore.test', password: 'Whatever1' } });
  assert.equal(unknown.status, 401);
});

test('owner can create a staff user; duplicate email is rejected', async () => {
  const { data: login } = await api('/api/auth/login', { body: OWNER });
  const created = await api('/api/auth/users', {
    token: login.token,
    body: { ...STAFF, role: 'sales', name: 'Test Sales' },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.user.role, 'sales');

  const dup = await api('/api/auth/users', {
    token: login.token,
    body: { ...STAFF, role: 'sales', name: 'Again' },
  });
  assert.equal(dup.status, 409);
});

test('non-admin roles cannot create users', async () => {
  const { data: login } = await api('/api/auth/login', { body: STAFF });
  assert.equal(login.user.role, 'sales');
  const res = await api('/api/auth/users', {
    token: login.token,
    body: { email: 'x@divemore.test', password: 'XyzPass12', role: 'sales', name: 'X' },
  });
  assert.equal(res.status, 403);
});

test('forgot/reset cycle: code from outbox resets the password exactly once', async () => {
  const forgot = await api('/api/auth/forgot-password', { body: { email: STAFF.email } });
  assert.equal(forgot.status, 200);

  // The server answers forgot-password before delivering the code
  // (privacy-preserving), so poll the outbox until the code lands.
  let code = null;
  for (let i = 0; i < 50 && !code; i += 1) {
    try {
      const lines = readFileSync(outbox, 'utf8').trim().split('\n');
      const line = lines.filter((l) => l.includes(STAFF.email)).at(-1);
      code = line?.match(/code=(\d{6})/)?.[1] ?? null;
    } catch { /* outbox not written yet */ }
    if (!code) await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(code, 'reset code was delivered to the outbox');

  const wrongCode = await api('/api/auth/reset-password', {
    body: { email: STAFF.email, token: '000000', newPassword: 'NewSales1' },
  });
  assert.equal(wrongCode.status, 400);

  const reset = await api('/api/auth/reset-password', {
    body: { email: STAFF.email, token: code, newPassword: 'NewSales1' },
  });
  assert.equal(reset.status, 200);

  const reuse = await api('/api/auth/reset-password', {
    body: { email: STAFF.email, token: code, newPassword: 'Another1' },
  });
  assert.equal(reuse.status, 400);

  const oldLogin = await api('/api/auth/login', { body: STAFF });
  assert.equal(oldLogin.status, 401);
  const newLogin = await api('/api/auth/login', { body: { email: STAFF.email, password: 'NewSales1' } });
  assert.equal(newLogin.status, 200);
});

test('forgot-password answers 200 even for unknown emails', async () => {
  const res = await api('/api/auth/forgot-password', { body: { email: 'ghost@divemore.test' } });
  assert.equal(res.status, 200);
});

test('change password requires the token and the current password', async () => {
  const { data: login } = await api('/api/auth/login', { body: { email: STAFF.email, password: 'NewSales1' } });

  const noToken = await api('/api/auth/change-password', {
    body: { email: STAFF.email, currentPassword: 'NewSales1', newPassword: 'Changed1' },
  });
  assert.equal(noToken.status, 401);

  const wrongCurrent = await api('/api/auth/change-password', {
    token: login.token,
    body: { email: STAFF.email, currentPassword: 'NotThePass1', newPassword: 'Changed1' },
  });
  assert.equal(wrongCurrent.status, 401);

  const same = await api('/api/auth/change-password', {
    token: login.token,
    body: { email: STAFF.email, currentPassword: 'NewSales1', newPassword: 'NewSales1' },
  });
  assert.equal(same.status, 400);

  const changed = await api('/api/auth/change-password', {
    token: login.token,
    body: { email: STAFF.email, currentPassword: 'NewSales1', newPassword: 'Changed1' },
  });
  assert.equal(changed.status, 200);

  const relogin = await api('/api/auth/login', { body: { email: STAFF.email, password: 'Changed1' } });
  assert.equal(relogin.status, 200);
});
