# Phase 51 — Own API Server (زي v20 الأصلي)

The login now runs against **your own API server** (the `server/` folder),
following the original PHASE41 design: bcrypt password hashing + JWT
sessions. No Supabase needed.

## What the server does

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Server + database check (`status: ok`) |
| `POST /api/auth/login` | Login → JWT token + user (email, role, name) |
| `POST /api/auth/forgot-password` | Sends a 6-digit reset code (30 min, 5 attempts) |
| `POST /api/auth/reset-password` | Sets a new password with the code (single use) |
| `POST /api/auth/change-password` | Change password while signed in (all roles) |
| `POST /api/auth/users` | Create a staff account (owner/admin only) |

Roles: `owner`, `admin`, `finance`, `accountant`, `accounting_manager`,
`operations`, `sales`. Passwords: 8+ characters, at least one letter and
one digit. Every login/reset/change is written to an audit log table.

## Database — two options

- **SQLite (default, zero-install):** leave `DATABASE_URL` empty. The
  server keeps everything in one file: `server/data/divemore.db`.
  Needs Node 22.5+ (Node 24 LTS recommended). Perfect for the office PC.
- **PostgreSQL (production):** set `DATABASE_URL` to a Postgres
  connection string and the server uses it instead (tables are created
  automatically on first start).

## Run it on the office Windows PC

1. Install **Node.js 24 LTS** from nodejs.org.
2. In the project folder: copy `.env.example` to `.env` and set:
   - `JWT_SECRET` — a long random string (32+ chars)
   - `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` — your owner login
   - `VITE_API_URL=http://<THIS-PC-LAN-IP>:8787` (e.g. `http://192.168.1.50:8787`)
   - `CORS_ORIGINS` — add the address the app is opened from
3. Start the server:
   ```
   cd server
   npm install
   npm start
   ```
   Check: open `http://127.0.0.1:8787/api/health` → `{"status":"ok",...}`.
4. Start the app (another terminal, project root):
   ```
   npm install
   npm run dev
   ```
5. Allow inbound TCP **8787** in Windows Firewall on the private network
   only, so other office PCs can reach the server. Do **not** expose
   8787 (or the database) to the public internet without a VPN or a
   TLS reverse proxy.

## Run it on a cloud server

Same steps on the server, plus:
- Set `DATABASE_URL` to your PostgreSQL (or keep SQLite on a persistent disk).
- Put the API behind HTTPS (reverse proxy / platform TLS) and set
  `VITE_API_URL=https://api.your-domain.com` in the frontend build.
- Add the frontend origin (e.g. your Vercel domain) to `CORS_ORIGINS`.

## Create staff accounts

From the server folder (works with either database):

```
npm run create-user -- person@divemore.com 'A-Long-Unique-Password1' sales 'Person Name'
```

Or while signed in as owner/admin, the app can call `POST /api/auth/users`.

## Password reset codes

- With SMTP settings (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, …) the code
  is emailed to the user.
- Without SMTP, the code is printed in the server console and appended
  to `server/data/reset-outbox.log` — the office admin reads it there and
  gives it to the staff member. Configure SMTP for real email delivery.

## Tests

```
cd server && npm test
```

Runs the full cycle against a temporary database: health, login,
wrong-password rejection, user creation + permissions, forgot/reset
(single-use code), and change password.

## Notes

- The frontend needs **no code changes**: with only `VITE_API_URL` set
  (Supabase vars empty), `src/auth.ts` uses API mode automatically.
- The old Supabase project is no longer used by this setup; it can be
  deleted from the Supabase dashboard whenever you like.
- Business data (bookings, payments, …) still lives in the browser's
  localStorage in this build — moving those to the server is the next
  phase, same as noted in PHASE41.
