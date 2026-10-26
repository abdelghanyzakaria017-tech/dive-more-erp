# Phase 22 — Login, role visibility, and PADI mark

## UI changes
- Kept the existing Dive More globe/diver logo unchanged.
- Added a compact PADI-style partner mark above the existing Dive More & Ohana brand.
- Matched the Ohana wordmark font size to Dive More across desktop, tablet, and mobile breakpoints.
- Removed the Forgot Password control from the login form.
- Kept Remember Me and the password visibility control.

## Demo role behavior
The demo login still infers role from the email address:
- `accountant` / `bookkeeper` → Accountant: can enter/approve bonus.
- `accountingmanager`, `accounting-manager`, `accounting_manager`, `accounting.manager`, `accountmanager`, or `accountsmanager` → Accounting Manager: bonus viewer only.
- `finance` → Finance Manager: can manage commission conversion rates and view monthly commission summaries.
- `owner` → Owner: view-only for bonus and commission sections.

## Important security limitation
This remains a local demo. Email-based role inference is not authentication and must not be used to protect real financial data. Before production, replace it with Supabase Auth (or another trusted identity provider), server-enforced role claims, and database RLS policies. UI hiding alone is not a security boundary.

## Verification
- `npm test`: 27/27 tests passed.
- `npm run build`: not verified; installing dependencies timed out in the current environment.
