# Phase 41 — Windows Desktop + PostgreSQL Foundation

## What this phase adds
- Electron desktop shell with isolated preload/context; Windows NSIS installer configuration.
- Central Express API service and PostgreSQL 16 Docker Compose setup.
- SQL migration for users, bookings, payments, exchange rates, serial ranges, vessel events, audit log, and settings.
- Server-side password hashing (bcrypt), JWT sessions, user creation endpoint restricted to Owner/Admin, audit logging for server login and API booking writes.
- Login now authenticates against the central API; local shared demo password and email-derived roles are removed.
- A visible server/database reachability indicator in the workspace.
- Basic booking API endpoints with unique ticket IDs and optimistic version checks on updates.

## Important status boundary
This is a foundation phase, not the completed ERP migration. The current React screens still read/write many business records (bookings, payment verification, exchange rates, serial ranges, audit display, fleet events) through localStorage. The API and PostgreSQL schema exist, but the whole UI has NOT yet been migrated to server-backed transactions. Do not use this build as the production source of truth until Phase 42 completes that migration and multi-client concurrency tests pass.

## Windows setup (central server)
1. Install Docker Desktop on the computer that will host the database/API.
2. Copy `.env.example` to `.env`.
3. Set unique strong values for `POSTGRES_PASSWORD`, `JWT_SECRET` (32+ random characters), `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` (12+ characters). Never share the `.env` file or commit it.
4. Set `VITE_API_URL` to the server computer's LAN address, for example `http://192.168.1.50:8787` (use the real address, not this example).
5. Run `docker compose up -d --build` and verify `http://SERVER-IP:8787/api/health` returns `status: ok` and `database: connected`.
6. Allow inbound TCP 8787 only on the trusted office network. Do not expose PostgreSQL port 5432 to the internet. For remote offices use a VPN or a properly secured TLS reverse proxy.
7. Create each user's account from an administrator terminal: `docker compose exec api node src/create-user.js person@divemore.com 'A-Long-Unique-Password' sales 'Person Name'`. Roles: sales, operations, accountant, accounting_manager, finance, finance_manager, owner, admin.

## Build the Windows installer
1. On a Windows build machine, install Node.js LTS.
2. From the project folder, copy `.env.example` to `.env` and set `VITE_API_URL` to the reachable central API URL.
3. Run `npm.cmd install`, then `npm.cmd run desktop:build`.
4. Installer output is placed in `release/`.
5. Install on each Windows PC. All PCs must be able to reach the central API address.

## Local development
- Server: `docker compose up -d --build`
- UI: `npm.cmd run dev`
- Desktop dev window: `npm.cmd run desktop:dev`
- Health check: `http://127.0.0.1:8787/api/health`

## Validation notes
The package was statically inspected and JavaScript syntax checks are run during packaging. A production Electron installer and a real PostgreSQL connection cannot be claimed until dependencies are installed and Docker/PostgreSQL are available in the build environment.
