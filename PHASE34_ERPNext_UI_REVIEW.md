# Phase 34 — Accountant payment review and ERP workspace design review

## Payment workflow defect repaired

The Payment Verification page was already listed for the `accountant` role, and its action buttons were rendered, but both `openPaymentDialog` and `submitPaymentDialog` rejected any role except `finance` and `owner`. This produced a visible UI with controls that appeared to work but did nothing for the accountant.

A single `canReviewPayments(role)` policy now allows `accountant`, `finance`, and `owner` to open and submit payment review actions. Sales, Operations and Accounting Manager remain unable to confirm/reject customer payments or record treasury handover. That role policy is unit-tested.

The accountant can:
- confirm all or part of a Sales-reported payment;
- reject an unverified reported amount with a mandatory reason;
- require a reference when confirming Visa;
- record full or partial physical Cash handover from Sales to the treasury;
- review the append-only-in-flow history displayed for the payment.

Finance-only reporting, FX-rate editing, serial-range allocation and monthly commission remain restricted to Finance/Owner as they were.

## ERPNext/Frappe patterns studied and applied

This is a design-pattern adaptation, not a copy of ERPNext source code, branding, icons, or assets.

- Persistent workspace navigation and clear active-section state.
- Strong page hierarchy and consistent spacing across workspace headings, number cards, panels, table views and forms.
- Data-list emphasis: clear column headers, horizontal overflow containment, row hover state and compact, legible statuses.
- Transaction confirmation uses a focused modal, action-specific labels, audit history and visible errors.
- Small, restrained transitions for workspace entry, feedback, buttons and surfaces; `prefers-reduced-motion` disables them.
- Clear focus rings for keyboard users.

## Research coverage and sources

I reviewed the public ERPNext repository page, the official Frappe Desk/workspace documentation, and the public Frappe UI design philosophy. A direct `git clone` of the repository could not complete in this execution environment because GitHub DNS/network access was unavailable; this is therefore a design-pattern adaptation based on reachable public sources, not a claim of exhaustive line-by-line source-code reverse engineering.


- Frappe Desk: https://docs.frappe.io/framework/user/en/desk — describes the persistent sidebar, workspace, list/form views, report builder and document timeline.
- Workspace concepts: https://docs.frappe.io/framework/user/en/desk/navigation/workspace — workspace pages group frequently used destinations, shortcuts and dashboard content.
- Frappe UI repository: https://github.com/frappe/frappe-ui — documents reusable app-shell, buttons, dialogs, list components and design tokens.
- Frappe UI philosophy: https://github.com/frappe/frappe-ui/blob/main/PHILOSOPHY.md — accessibility basics such as labeled controls, visible states and reduced motion.

## Prototype limits

The app still persists locally in the browser. A TypeScript/React role guard improves demo behavior but is not server-side authorization. Production needs authenticated server-side permission checks, shared persistent storage, and an authoritative audit log.
