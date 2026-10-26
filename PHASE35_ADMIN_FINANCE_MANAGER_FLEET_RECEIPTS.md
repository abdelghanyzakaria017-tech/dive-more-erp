# Phase 35 — Admin / Finance Manager / Fleet / Client Receipts

## Role access (local demo)
- `admin@...` or any email whose local part contains `admin`: all current app modules.
- `owner@...`: all current app modules.
- `finance_manger@...` (requested spelling) and `finance_manager@...`: Finance plus collection review and Operations booking/fleet workflows.
- The shared demo password remains `DiveMore@2026`.
- Sales is scoped to the salesperson code derived from the email; Sales cannot approve bookings.

These are UI/demo role-routing rules, not production authentication or server-enforced authorization.

## Booking register and Operations
- The Overview and Bookings pages render the live local demo register.
- Operations, Accountant, Finance Manager, Owner and Admin can assign vessels, confirm/reject bookings, and record not-executed status according to the role helpers. Finance access remains separate for cancellation/refunds/reports/rates.
- Fleet list: Blue, Carmen, Utopia Star; Glass Salma and Glass El Garia; Speed Bdeir and Speed Ryan; Speed Center Dive More and Speed Center Ali.
- Availability can be closed/reopened by date with a reason. Assignments are rejected for closed vessels, overlapping use of the same vessel/date/time, or a vessel group that does not match the service.
- Orange/Boat/Speed/Glass Boat bookings require a confirmed vessel assignment before Operations can confirm them.

## Payment / client copy
- A payment can be reported above the ticket total. Excess is surfaced as an overpayment/Visa difference; it does not create a negative balance.
- Visa receipt/transaction reference is optional. An image can instead be attached to the payment.
- Sales can attach or replace an image from a payment in the Booking register, view/download it, and print the ticket/client receipt. The printable receipt includes ticket and passenger details, payment lines, customer signature and any attached payment images.
- Uploaded images are limited to 2 MB each in this local demo.

## Validation
- Run logic tests: `npm.cmd test`
- Run local app: `npm.cmd install`, then `npm.cmd run dev`
- Full Vite/TypeScript production build was not verified in the build environment because dependency installation could not complete. Data, role routing, vessel closures and receipt images remain local to the browser until connected to a real backend/storage service.
