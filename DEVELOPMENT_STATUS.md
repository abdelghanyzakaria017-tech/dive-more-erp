# Development status — Phase 14

## Implemented in the local prototype
- Added an in-app dialog for cancellation, rejection, non-execution reasons, and refunds; the workflow no longer depends on browser `prompt()` dialogs.
- Added mobile-friendly dialog styling, keyboard dismissal, accessible dialog labels, and error messages inside the form.
- Hardened refund entry: amounts are rounded to currency cents and checked against the original payment's remaining refundable amount.
- Kept refunds tied to the original payment currency and rate snapshot; reports display separate totals by currency.
- Improved demo serial allocation so a cleared or stale sequence key does not immediately reuse serials already present in saved bookings.
- Fixed the pending-approval count to follow the currently visible bookings for Sales.
- Added same-browser-tab synchronization for demo bookings and exchange-rate changes.
- Completed translations for the labels added in the revenue/refund workflow in Arabic, English, German, Russian, and Chinese.
- Reworked package scripts to use Node's built-in test runner for the independent domain tests and removed unused dependencies.
- Added database migration `0007_development_hardening.sql` with a separate execution status, protected serial allocation, server-side booking/payment validation, refund authorization, audit logging, and restricted Finance/Operations summary functions.

## Validation performed
- `npm run test`: passed (9 tests).
- TypeScript/TSX syntax transpilation: passed for the app, entry point, and Vite config.
- Translation-key check: no missing `t()` keys.
- Full `npm run build`: **not verified**. Dependency installation failed because this environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`), so React, Vite, and their type packages are not installed here.
- Migration `0007` has not been executed against PostgreSQL/Supabase. Run it only in a disposable test project first.

## Still not production-ready
- The current React app still uses the demo login and browser localStorage; it does not call the new Supabase RPCs.
- There is no working multi-device sync, deployed Supabase Auth, production RLS verification, or central serial allocation from the UI yet.
- Availability is still a prototype. Resource capacity, overlap/maintenance rules, private-resource locks, and branch-transfer confirmation need a database-backed workflow before live operation.
- Historical Excel data is not imported. Reconcile the workbook and serial ranges before any import.
- Do not use this prototype for real customer records, official serial assignment, or accounting decisions.

## Phase 15 — Finance payment verification

Implemented in this source package:
- Sales-reported payments start pending Finance review; reported amounts and finance-verified amounts are displayed separately.
- Finance can verify an additional full or partial amount, reject a fully unverified claim with a reason, and review rejected rows again.
- Visa confirmation requires a receipt/transaction reference.
- Physical cash handover from Sales to the treasury is a separate action and supports partial handover.
- Booking status and payment status are displayed independently.
- Refund limits are based on Finance-verified amounts in the demo domain logic.
- Reports now display verified receipts in each original payment currency rather than treating all Sales-entered amounts as cash received.
- Added migration `0008_finance_payment_verification.sql` with Finance/Owner-only RPCs, audit events, refund guard, and report changes.

Validation performed:
- 23 Node test cases passed over 10 consecutive runs (230 passing test executions).
- `src/domain.js` syntax check passed.
- TypeScript TSX syntax transpilation passed.
- Supplemental source type check passed with a temporary React shim because dependencies were unavailable.
- Official `npm install` timed out; therefore the official Vite production build and browser end-to-end tests remain unverified.

Known limitation: the React interface is still local demo state (localStorage). The SQL migration is proposed only and has not been applied or tested against Supabase. The interface must be connected to the RPCs and tested under real authenticated user roles before handling live money.
