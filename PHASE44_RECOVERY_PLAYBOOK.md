# Dive More ERP — Error Prevention & Recovery Playbook

This guide is intended for the person who sees an error while working in Sales, Operations, Accounting or Finance. **Do not delete a ticket or retry a money operation repeatedly just to clear an error.** First identify whether the first attempt already saved.

## If Sales creates the wrong ticket

1. Record the ticket serial, date/time, salesperson and the incorrect field. Check the ticket list before clicking Save again.
2. For a wrong passenger count, service, date, time or description, use the approved edit/correction workflow when it is available. Keep the original ticket and its history.
3. If the wrong ticket is a duplicate, stop issuing further numbers and ask Finance/Admin to reconcile the duplicate and serial range. Never reuse a serial because a browser record was removed.
4. If the booking failed because the serial range is empty or stale, Finance must verify the range assignment and the last used serial before Sales retries.
5. If the server is offline, do not treat the local demo screen as centrally saved. Wait until connectivity is restored and confirm whether the attempted record exists before re-entry.

## If a payment amount does not match cash or a receipt

1. Do not confirm the full claim. Compare the ticket serial, currency, method, original amount and receipt/physical cash.
2. If only part is supported, verify only that amount. The remaining amount stays unverified.
3. Reject a payment only when no part can be confirmed and enter a specific reason (for example, “cash counted short by 500 EGP”). A partially verified payment cannot be rejected wholesale; verify the remainder or leave it partial.
4. Cash handover can only use the verified Cash amount not already handed over. Visa is not a physical-cash handover.
5. If the operation reports “already changed by another user” or a stale-version conflict, refresh and inspect the payment history before retrying. Do not repeat the same handover/refund blindly.

## If a refund is wrong or blocked

1. Check the original payment selected, its currency, verified amount and previous refund history.
2. Enter the refund amount in the original payment currency. The refundable balance cannot exceed the verified remainder of that original payment.
3. Add a specific reason. Do not refund an unverified or rejected claim.
4. If an earlier partial refund was posted, calculate the remaining refundable amount from that same payment; do not create a new payment or edit `refunded` manually to “balance” the screen.
5. If an incorrect refund has already been recorded, stop. The correction needs an explicit, audited reversal/adjustment workflow and approval; it should not be hidden by deleting history.

## If a bonus or commission looks wrong

1. Confirm ticket serial, ticket currency, ticket selling FX snapshot, commission FX snapshot, passenger count and approved bonus reason.
2. The current bonus rule is EGP 250 per approved person. The accountant must provide a whole number from 1 to 1000 and a non-empty reason.
3. Bonus reduces commission basis only; it must not reduce customer ticket price or gross ticket revenue.
4. Finance should correct the underlying rates through the approved rate workflow and preserve historical rate snapshots. Do not recalculate old tickets with a new FX rate unless an approved correction policy requires it.
5. Commission is a provisional summary, not a payroll ledger, until monthly close, approval and payout states are implemented centrally.

## If Operations sees a booking or vessel conflict

1. Do not mark a trip Done before the required vessel is assigned and verified as compatible with the service.
2. Check the trip date/time, vessel, capacity, closure/maintenance record and overlapping assignments.
3. Rejection, cancellation or Not Executed must retain a reason. Keep the serial and record; do not delete the row to remove it from the daily view.
4. For an external execution, use the free-text Details/External Execution field and the Daily Situation line; confirm printing uses the correct operating date.
5. Live availability/capacity checks still require a server-backed booking transaction and multi-user test; the local screen cannot guarantee no conflict between computers.

## If the application shows a server/database error

1. Check `http://SERVER-IP:8787/api/health` from the same workstation. `status: ok` and `database: connected` means the API can reach PostgreSQL at that moment, not that every business screen has synced.
2. If login/session validation returns 401, sign in again; if it returns 503, verify server/database health before retrying.
3. For a 409 ticket-serial conflict, refresh and reconcile the current serial range. Do not change the serial randomly.
4. For a failed multi-step operation, verify whether the API reported rollback. Inspect the ticket/payment and audit record before retrying.
5. Do not expose PostgreSQL port 5432 to the internet. Backups, restores, credentials, and `.env` files must be handled by the designated admin only.

## Escalation packet

When asking an administrator to resolve an incident, include: the ticket serial, affected payment ID or row, action attempted, exact error message, date/time with timezone, signed-in role, workstation name, screenshot, and whether the record appears after a refresh. Never send passwords, JWT tokens, or `.env` secrets in screenshots or chat.
