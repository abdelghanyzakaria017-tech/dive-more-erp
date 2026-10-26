# Phase 18 — Ticket Bonus and Sales Commission

## Demo workflow
- Sign in using an email containing `accountant` to preview the Accountant role.
- Sign in using an email containing `finance` to preview the Finance Manager role.
- Accountant can record a bonus as a negative EGP adjustment and must provide a reason.
- Finance Manager/Owner can configure commission conversion rates per currency, independently of selling exchange rates.
- Sales commission is fixed at 10% of the commission basis in EGP.

## Calculation currently implemented
- Final ticket price in EGP = ticket amount × selling rate + negative EGP bonus.
- Commission basis in EGP = ticket amount × separate commission rate + negative EGP bonus.
- Sales commission = 10% × commission basis, floored at zero.

Example: ticket EUR 100, selling rate 54, bonus -200 EGP, commission rate 56:
- Final customer ticket value = 5,200 EGP.
- Commission basis = 5,400 EGP.
- Sales commission = 540 EGP.

This is a demo implementation of the stated rule. Confirm with Finance whether the bonus should reduce both the ticket final value and the commission basis before using it for payroll/accounting.

## Access and persistence
- Role selection is demo-only and inferred from the email. It is not authentication.
- Bonus and commission settings persist in localStorage only; they are not shared across devices.
- Migration `0011_ticket_bonus_commission.sql` is a schema proposal only. Review table/foreign-key names against the deployed database, then implement authenticated server-side RPCs and RLS policies before production.
- Audit columns are included for bonus reason, actor and timestamp. Current demo UI records these locally.
