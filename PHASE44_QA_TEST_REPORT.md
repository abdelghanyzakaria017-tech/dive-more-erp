# Dive More ERP — Phase 44 QA & Error-Control Review

**Source reviewed:** Phase 43 Sales Terms & Conditions, including the current Electron/PostgreSQL foundation.  
**Purpose:** risk-based testing of mistakes that Sales, Operations, Accounting, Finance Manager, Owner and Admin can make, with prevention and recovery controls.

## Test result

| Check | Result |
|---|---:|
| Automated Node tests | **70 passed / 0 failed** |
| Existing regression suite | 30 passed |
| New financial/input regression tests | 24 passed |
| Server booking-control tests | 16 passed |
| Deterministic financial stress combinations | 500 combinations exercised inside the automated suite |
| JavaScript syntax checks | Passed for `src/domain.js`, `server/src/booking-controls.js`, `server/src/index.js`, database helpers and Electron entry files |
| TypeScript/JSX syntax transpilation | Passed for `src/App.tsx`, `src/main.tsx`, declarations, API client and Vite config |
| Full production build | **Not passed / not verified.** The workspace does not have React, Vite and their project dependencies installed. `npm run build` therefore reports missing module/type definitions and follow-on TypeScript errors. |
| Live PostgreSQL tests | **Not run.** Docker and `psql` are unavailable in this environment. |
| Electron Windows installer | **Not built or verified.** |
| Full UI-to-API end-to-end test | **Blocked.** The React UI still reads/writes business records in browser `localStorage`; it currently only calls the API for sign-in/health, not booking/payment/rates workflows. |

The 70 passing tests are real automated tests of domain functions and pure server control helpers. They are **not** proof that database transactions, browser flows, or the Windows installer work end-to-end.

## Bugs found and addressed in this phase

1. **Invalid ticket totals could look financially valid.** Negative, blank or non-numeric totals were being coerced to zero by the financial helper. The helper now rejects them as invalid.
2. **Invalid ticket FX silently fell back to rate 1.** Payment-summary calculations now return zero rather than calculate using a misleading default when the ticket FX is invalid. A zero summary must still be treated as an error state by the UI, not as evidence that no payment exists.
3. **Finance-only service text could bypass common aliases.** The detector now catches `xtra dive` and punctuation variants in addition to existing Extra/Ext/D.Dive forms.
4. **Half-cent rounding could round a value such as 39.995 down unexpectedly.** Money clamping now scales the floating-point tolerance so the half-cent boundary is consistent.
5. **Blank bonus headcount could be silently treated as one person.** Bonus approval now rejects an empty/non-integer/out-of-range count or missing reason; the UI no longer defaults a cleared field to one.
6. **Overlapping serial ranges for one employee were not detected by the old client check.** Range validation now checks intersections, malformed ranges and already-used serial suffixes.
7. **API booking creation trusted several client-provided finance fields.** New server helpers validate required fields and payment rows, take FX values from the database rate table, force new payments to Pending/zero verified/zero handover, remove client-provided bonus/commission approval fields, and force the initial status to Waiting for Operation Permission.
8. **Sales serial prefix and terms acceptance needed server validation.** Server-side creation validation checks that Sales uses their authenticated email/code, accepts the terms with a timestamp, and uses a serial for their own sales code. The API route also locks the assigned database serial-range row and requires the expected next number.
9. **Booking-list responses could expose bonus/commission fields to inappropriate roles.** The server response serializer now strips bonus data from Sales/Operations and commission data from roles that should not see it.
10. **Disabled accounts could keep using an 8-hour token on routes that did not re-check account status.** API auth now re-checks the database account and current role on protected requests.
11. **Generic Owner/Admin updates could overwrite money fields or save without an expected version.** The generic update route now requires `expectedVersion`, validates critical booking fields/status reasons, checks stale edits and blocks changing financial fields outside a dedicated financial workflow.

These server-side changes are unit-tested as pure controls, but their SQL behavior must still be tested against a disposable PostgreSQL database before deployment.

## Highest-priority remaining risks

### P0 — Do not use as production financial source of truth yet

- The UI's bookings, payments, exchange rates, serial ranges, refunds, bonuses, vessel events, Daily Situation and general audit feed are still local/demo state. The business UI does not call the central CRUD APIs yet, so two computers do **not** yet share all business transactions.
- Dedicated API/database transactions are still needed for Operations approval, payment verification/rejection, cash handover, refunds, bonus approval, exchange-rate updates, commission close, vessel assignment/closure, Daily Situation editing, and audit history. UI-only guards are not a security boundary.
- Live PostgreSQL migration, concurrent-user, duplicate-submit, rollback and restoration tests have not been run.

### P1 — Business rule decision / acceptance required

- **Refund Terms contradiction:** one clause says no refund within the first 24 hours after booking; another says a full refund is due when no more than 6 hours have passed. Those conditions conflict for the first six hours. This package preserves the supplied wording; it does not invent a precedence rule. The business owner must approve a single unambiguous policy before these terms are used officially or tied to refund automation.
- Serial-range reservation must be seeded from reconciled historical tickets before live issuance. A range must not be reused simply because a ticket record was deleted or is missing from a local browser.
- Legacy payments/refunds need reconciliation before migration because legacy records can follow compatibility paths that assume old payment states.

## How to run the automated suite

From the extracted project root:

```powershell
npm.cmd test
```

With dependencies installed, run the full TypeScript/Vite production build:

```powershell
npm.cmd install
npm.cmd run build
```

Server test helpers are included under `server/tests`. A real acceptance run still requires a disposable PostgreSQL instance and at least two client sessions with separate roles.

## Suggested production acceptance gate

Do not approve the system for live money until all are true:

1. `npm run build` succeeds on the target Windows build machine and an installer opens successfully.
2. PostgreSQL migrations run cleanly on a fresh test database; backup/restore has been demonstrated.
3. Two devices create/update the same test data and see the same result after refresh/restart.
4. Two simultaneous requests for the last serial produce one success and one safe conflict, never two tickets.
5. Sales cannot read another salesperson's bookings, bonus or commission; Operations cannot post financial approvals; Finance/Accounting cannot change fields outside their assigned actions.
6. Payment verification, partial verification, rejection, cash handover and refund workflows use server transactions and append immutable audit events.
7. A forced exception in each multi-step transaction produces a rollback with no half-saved ticket/payment/audit chain.
8. The owner approves the refund policy wording and the commission/bonus reporting rules.
