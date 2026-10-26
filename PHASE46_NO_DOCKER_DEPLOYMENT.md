# Phase 46 — No-Docker Deployment Path

- Removed Docker Compose setup scripts and Dockerfile from the delivery path at the user's request.
- Backend now honours `PORT` first (required for managed application hosting), then falls back to `API_PORT` and 8787 for local development.
- Declared Node.js >=20 runtime requirement for the API.
- Added Arabic step-by-step guide for GitHub + DigitalOcean App Platform + Managed PostgreSQL deployment without Docker.
- Added security reminders for env vars and exposed credentials.
- Windows installer build continues via `Build-Installer.bat`; installer has to be built on a Windows machine with npm registry access.

Limitations: deployment to user's DigitalOcean account is not performed from this workspace; backend endpoints do not yet cover every ERP business workflow, and end-to-end production DB tests have not been run.
