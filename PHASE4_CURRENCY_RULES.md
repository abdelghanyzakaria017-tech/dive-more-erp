# Phase 4 — Independent currency handling

## Rules
- Each booking/ticket has a selected currency: EGP, USD, EUR, or GBP.
- Every payment stores its original amount, original currency, payment method, and a snapshot of the finance-approved exchange rate at payment time.
- Finance rates are entered as **EGP per one unit** of each currency; EGP is the reference currency (1 EGP = 1 EGP). This is not a rule to convert every payment to USD.
- For a payment in the same currency as the ticket, its ticket value is the original amount exactly. For a different currency, its ticket-currency equivalent is calculated from the EGP-per-unit snapshots at the time the payment is recorded.
- Ticket balance is always shown in the ticket's currency. Reports group ticket totals by currency and must never add EGP, USD, EUR, and GBP as if they were the same unit.
- Changing a finance rate affects new payments only; historical snapshots must not be recalculated automatically.

## Example
Ticket: 100 EUR. Payment 1: 40 EUR (counts as exactly 40 EUR). Payment 2: 2,000 EGP. If the finance rate snapshot is 54 EGP per EUR, payment 2 is equivalent to 37.0370 EUR for this ticket balance. The payment record remains 2,000 EGP and is displayed as such; the equivalent is separately stored for balance calculation.

## Important implementation status
This update adjusts the demo UI and adds a migration. It is not yet connected to Supabase. Demo rates are examples only (USD=50 EGP, EUR=54 EGP, GBP=64 EGP) and must be replaced with finance-approved values. Authentication and server-side authorization need testing before real use.
