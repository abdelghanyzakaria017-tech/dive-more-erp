# Dive More ERP — Development prototype

A responsive Arabic RTL React + TypeScript + Vite prototype for Dive More booking operations.

## Included
- Login screen design and role-based demo navigation.
- Sales booking form with optional numeric `Hours`.
- Availability overview and booking list.
- Operations review actions (`Waiting for Operation Permission` → `Done` / `Rejected`).
- Remaining balance display for operations without showing the finance reports page.
- Finance/owner demo report summary.
- Initial Supabase/PostgreSQL schema and starter RLS policies in `supabase/migrations/0001_initial_schema.sql`.

## Run locally
Requires Node.js 20+ (recommended).

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

## Demo role selection
The login is **not real authentication**. To preview role-specific UI, enter any email and password; an email containing `operation` opens Operations, `finance` opens Financial Manager, `owner` opens Business Owner, and any other email opens Sales. This is only a visual prototype and is not secure. Do not use it with real customer data.

## Current limitations — not production-ready
- Booking, refund, status-history, and exchange-rate values persist in localStorage on this browser; they are not shared reliably across devices.
- Supabase Auth and live database connection are not implemented.
- The SQL is a starting point requiring a security review before production. In particular, implement strict column/status transition permissions, audited role provisioning, a balance-only Operations RPC/view, and server-side atomic capacity/overlap validation.
- Offline queue, reliable multi-device sync, currency exchange rules, external suppliers, resource schedules/closures management, and production test suite are not yet implemented.
- Demo report amounts are illustrative and must not be used for accounting.

## Suggested next milestones
1. Configure Supabase project and Auth; provision roles only through trusted admin tooling.
2. Finish hardened RLS policies and Operations balance-only access.
3. Implement atomic booking/availability RPCs to prevent clashes across tablets.
4. Add payments with currencies and separate gross amount, card fee, and settlement amount.
5. Implement IndexedDB outbox, idempotent sync, and automated tests.
6. Import cleaned historical Excel data only after schema validation and backup.

### Exchange rate configuration (prototype)
Finance/Owner roles can open **أسعار الصرف** and edit EGP/EUR/GBP rates as USD value per one unit. USD is fixed at 1. The current UI stores changes in localStorage on this browser only; do not use this for real multi-device accounting. Migration `0003_finance_exchange_rates.sql` provides the initial Supabase table/RLS, but production integration and review are still required. Seed rates are examples and must be confirmed by Finance.

## Phase 4 currency update
See `PHASE4_CURRENCY_RULES.md`. Ticket totals now have a selectable currency, payment rows retain their original currency, and the finance UI edits rates as EGP per one unit of each currency. Apply migration `supabase/migrations/0004_currency_independent_payments.sql` to a **test** Supabase project only after reviewing schema/role policies. The current UI remains demo/local-state only; no live database sync has been wired.


## Phase 6 — Revenue control (demo)
See `PHASE6_REVENUE_CONTROL.md` for the scope and important limitations. Finance/owner can now explore cancellation, not-executed, and refund tracking in the demo UI. SQL proposal: `supabase/migrations/0005_revenue_cancellations_serial_audit.sql`.


## Phase 7 — Revenue workflow hardening proposal
- Demo booking state now persists in browser localStorage between reloads on the same device.
- Finance/Owner can mark bookings cancelled or not executed with a required reason and can record demo refunds.
- Migration `0006_revenue_workflow_hardening.sql` proposes server-side atomic serial reservation, per-payment refund caps in original currency, and audited status changes.
- Important: the UI still uses demo role selection and localStorage; the SQL migration has not been applied or tested against a real Supabase project. Review schema/RLS compatibility and test in a disposable project before production.


## Phase 8 — Odoo-inspired UI and review
See `PHASE8_UI_REVIEW.md` for the UI direction, fixes, validation status, and prototype limitations. The UI is inspired by common ERP usability patterns and is not an Odoo clone.


## Phase 14 — Development hardening
- In-app workflow and refund dialogs with mobile-friendly styling and required audit reasons.
- Refund checks per original payment, rate-snapshot handling, and independent totals per currency.
- Safer demo serial allocation, translated workflow labels, and same-browser-tab synchronization.
- Nine Node domain tests are available with `npm run test`.
- Migration `supabase/migrations/0007_development_hardening.sql` proposes stricter row access and server-side booking/refund/report contracts. It has **not** been run against a live database; validate it in a disposable Supabase project before use.

### Build and verification status
Install dependencies first, then run `npm run test`, `npm run build`, and `npm run dev`. The domain tests passed in the development environment, but a full build could not be verified here because package registry DNS resolution failed.

The application still uses demo login and local browser storage. The frontend is not connected to Supabase, and the current availability view does not enforce live resource capacity or overlapping-booking rules. Do not use it for live customer or accounting data until authentication, RPC integration, RLS, resource scheduling, and workbook reconciliation have been tested.

## Finance payment verification (Phase 15)

The demo now separates booking approval from payment verification. New Sales-reported payments start as pending, Finance can verify a full or partial amount, Visa verification requires a transaction reference, rejection requires a reason, and cash handover into treasury is tracked separately. Only verified payment portions are refundable and counted in confirmed-receipt figures. See `PAYMENT_VERIFICATION_WORKFLOW.md` and `QUICK_START.md` for operating rules and test results.

`supabase/migrations/0008_finance_payment_verification.sql` provides the proposed database contract and Finance-only RPCs. It is **not applied or integrated with the demo UI yet**. Authentication/RLS, RPC wiring, and a real Supabase integration test are required before production use.
