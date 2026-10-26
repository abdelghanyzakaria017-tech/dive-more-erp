# Phase 36 — Responsive Tables and Status Clarity

## Why the earlier screens looked clipped

The booking register had a hard minimum width of 1360px and the payment-review table had a 1000px minimum width. With the fixed sidebar, the available content area on common laptop/tablet widths was narrower than those tables, so the user saw only part of each row and native file input controls looked inconsistent.

The yellow booking status in the booking register is **booking/Operations approval**, not the payment review status. Collection status is shown separately inside the reported/verified payment cell. A payment may be fully verified while its booking still awaits Operations approval.

## Changes

- On laptop and tablet widths, booking and payment-review tables change into labeled responsive cards rather than requiring horizontal scrolling.
- Added field labels to each card field for Arabic and English users, including ticket, customer/guests, service/time, vessel, total, reported/verified amount, remaining balance, booking status, receipt and actions.
- Renamed the booking status header to `حالة الحجز` / `Booking status` and the Arabic waiting state to `بانتظار الأوبريشن` to avoid confusion with payment verification.
- Made collection status explicitly display `حالة التحصيل` / `Collection status`.
- Styled the file chooser button for customer receipt attachments.
- Preserved the full-width table presentation on wider screens.

## Verification

- Node domain tests: 30/30 passed.
- TypeScript/TSX syntax transpilation: zero syntax diagnostics.
- Full Vite/TypeScript build not run because this project copy has no installed dependencies in the environment.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

This remains a local demo that stores data in the browser; use a server-backed database and authorization before production.
