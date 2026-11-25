# Phase 49 — Login repair and completed Forgot Password

## Why this branch exists
The GitHub repo contained only docs/config: `index.html` pointed at
`/src/main.tsx`, but no `src/`, `server/`, `tests/` or `electron/` files
had ever been pushed (4 commits, 46 files). The login page therefore
could not build or run from GitHub at all, and — per PHASE22 — the
Forgot Password control had been removed with no reset flow behind it.

This branch adds a fresh, self-contained login in `src/` so the repo
builds again, with the forgot-password flow completed end to end.
It does **not** recreate the rest of the ERP screens, which remain
only in the local source package.

## What was added
- `src/main.tsx`, `src/App.tsx`, `src/styles.css` — Arabic RTL login
  matching the documented branding (PADI mark, Dive More & Ohanaa
  wordmarks, lamp on/off scene from PHASE40, password visibility and
  remember-email from PHASE22/40).
- `src/auth.ts` — authentication logic, split into two modes:
  - **API mode** (`VITE_API_URL` set, per PHASE41): 
    `POST /api/auth/login`, `POST /api/auth/forgot-password`,
    `POST /api/auth/reset-password` against the central API.
    A non-2xx login response is an error; no session is invented.
    Forgot-password always shows a generic "if the account exists"
    message, so it cannot be used to enumerate accounts.
    The server side of these endpoints still has to be implemented
    in the (not yet pushed) `server/` code before API mode can reset
    a real password.
  - **Demo mode** (no `VITE_API_URL`): the documented role-preview
    login (role inferred from the email, PHASE20/22 precedence).
    Forgot password generates a 6-digit code, valid 30 minutes,
    max 5 attempts, single use, stored only as a SHA-256 hash.
    The code is shown on screen in demo mode only, so the flow can be
    completed on one device; in production it must be emailed.
    Resetting sets a local password (SHA-256 hash, never plain text)
    which then becomes the only password accepted for that email in
    demo mode — the old/any password stops working.
- Reset links/codes can also arrive as `?mode=reset&email=…&token=…`,
  which pre-fills the reset form.
- **Small Change Password section for all accounts:** the signed-in
  workspace shows a compact, collapsed-by-default Change Password
  section (`<details>` in `src/App.tsx`, `.change-password-small` in
  `src/styles.css`) with no role gate — admin, owner,
  finance, accountant, accounting_manager, operations and sales all
  see it. It requires the current password, rejects a new password
  that is the same as the current one, and enforces the same
  letter+digit / 8-character rule. API mode posts to
  `POST /api/auth/change-password` with the session JWT; demo mode
  verifies against the reset password if set, otherwise against the
  password used to sign in to this session (hash only in
  `sessionStorage`), then replaces the local password hash.
- `public/manifest.webmanifest` — the manifest `index.html` already
  referenced but which was missing.

## Verification
- `npm install`: succeeded (488 packages).
- `npm run build` (`tsc -b && vite build`): **passed** — dist built
  with no TypeScript errors (2026-11-17, Node 24 / npm 10).
- Manual flow check (demo mode): request code → reset with wrong code
  is rejected → reset with correct code → sign-in with the old/any
  password fails → sign-in with the new password succeeds.

## Limitations — read before merging to production
- Demo mode is not authentication (same warning as every prior phase).
- API-mode reset needs the matching server endpoints and a mail
  provider; neither exists in this repo yet.
- Password/code hashes in demo mode live in `localStorage` on one
  device only and are not a security boundary.
