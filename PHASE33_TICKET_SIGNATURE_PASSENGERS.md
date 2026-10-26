# Phase 33 — Accountant Payment Confirmation + Ticket Passenger Details

- Accountant retains access to the Payment Verification workspace to confirm/reject sales-reported customer payments and record physical cash handover to treasury.
- New tickets capture adult, child, and infant passenger counts.
- New tickets require a customer signature captured with a mouse or touch in the signature pad; the PNG data URL is stored on the local booking record.
- Passenger counts and signature are stored with the ticket in the demo's local booking state/storage.
- Demo only: signature/payment records remain browser-local. Production use requires server-side authentication, authorization, and persistent storage.
