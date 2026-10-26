# Payment Verification Workflow

## Intended flow

1. Sales enters the payment reported by the customer, with method, original currency, amount and the rate snapshot. New payment rows are stored locally as `Pending` and start with `verifiedAmount = 0`.
2. Finance reviews the payment from **Payment verification**. Finance can verify the full amount or a smaller amount. Any remainder stays unverified. Visa confirmation requires a receipt/transaction reference.
3. Finance can reject an unverified payment with a required reason. The prior review action is preserved in the local demo history.
4. Cash is tracked separately after collection verification. **Receive into treasury** records the amount physically delivered by Sales to Finance. This can be partial and cannot exceed verified cash not yet handed over.
5. The booking list shows the booking status and payment status as different states. Finance reports display verified payments, while the reported amount is shown separately.
6. Refundable amounts are capped at Finance-verified payments. Unverified or rejected payment amounts cannot be refunded through the updated demo workflow.

## Example: Sales reports EUR 60 cash

- When created: reported `EUR 60`, verified `EUR 0`, verification status `Pending`.
- Finance verifies EUR 60: verified `EUR 60`; cash still awaiting treasury shows `EUR 60`.
- Finance physically receives EUR 60 from Sales: handed over `EUR 60`; cash awaiting treasury becomes `EUR 0`.
- If Finance initially verifies only EUR 40, only EUR 40 is verified and available for cash handover; the remaining EUR 20 stays unverified.

## Validation and tests

- Node test suite: 23 test cases (including multi-currency arithmetic, full/partial verification, rejection, refund caps, cash handover and Visa reference validation).
- Test suite was repeated 10 consecutive times: all runs passed (230 test executions in total).
- TypeScript/JSX syntax transpilation passed.
- A source-level type check against a temporary React type shim passed. This is only a secondary static check and is not a substitute for the project's official `npm run build` with the real React type packages.
- The official install/build could not be run in this environment because `npm install` timed out. Run the official checks locally after package installation.

## Important limitation

The React interface currently persists demo state in the browser's local storage; it does not call Supabase. Migration `0008_finance_payment_verification.sql` defines database columns and server-side Finance-only RPCs, but it has not been applied or tested against a Supabase project. Until the UI is wired to those RPCs and RLS is tested with real user accounts, this is a workflow prototype—not an accounting system for real money.
