# Phase 48 — Final Release Candidate Readiness

## Implemented in this phase
- Added installable web-app metadata and 192/512px icons for Android tablets and iPad home-screen installation.
- Added a service worker for the frontend shell/assets. API traffic is never cached; this is not offline ERP support.
- Added certificate-authority verification for managed PostgreSQL TLS via `PGSSL_CA_BASE64` / `PGSSL_CA`; startup fails closed if TLS is enabled without a CA.
- Added a basic login-attempt throttle for the recommended single API instance.
- Removed the prototype warning banner from the in-app UI per request; limitations and operator instructions are in `FINAL_GUIDE_AR.md` only.
- Added the Arabic deployment and readiness guide for GitHub, DigitalOcean App Platform + Managed PostgreSQL, Vercel tablet web app, and Windows installer.

## Validation
- Automated Node tests: 84 passed, 0 failed.
- `node --check` passed for `server/src/index.js`, `server/src/db.js`, and `public/sw.js`.
- Full React/TypeScript production build was not run because dependency installation timed out in this environment.
- No DigitalOcean, GitHub, or Vercel deployment or real PostgreSQL connection was performed here.

## Release-blocking limitation
The UI still uses localStorage for several business workflows (including parts of booking/payment/refund/bonus/commission/exchange-rate/daily-situation workflows). The backend does not yet expose and connect every operation. The UI can be installed/opened on a tablet, but cross-device financial data integrity is not complete. Do not use this release candidate as the authoritative live ERP until all business operations are moved to API/PostgreSQL and tested end-to-end.

## Scaling limitation
The login attempt throttle is in-process and is intended for one API instance. Before scaling the API horizontally, replace it with a shared rate limiter (for example Redis) and test proxy/IP handling.
