# Phase 19 — Sales Bonus and Monthly Commission

- Sales Bonus is a salesperson incentive approved by the accountant for qualifying high-value tickets; the accountant enters EGP bonus **per person**, number of people, and approval reason. The total bonus is stored on the ticket as a negative EGP adjustment **only for commission calculations**.
- The customer's ticket price and company gross revenue are **not reduced** by the bonus.
- Commission is calculated as 10% of `max(0, ticket total × commission FX rate − total sales bonus in EGP)`.
- Monthly summary groups `Done` tickets by ticket month and salesperson, with ticket count, gross commission basis before bonus, bonus deducted, adjusted basis, and commission. This is provisional eligibility, not a settled payroll ledger.
- Example: USD 130 ticket, EGP 50/USD, 2 people × EGP 250 bonus = EGP 500. Ticket sale EGP 6500, adjusted commission base EGP 6000, commission EGP 600. Sales incentive + commission EGP 1100.
- Demo only: localStorage; no real server-side authentication, approvals, monthly close, payout tracking, or production database migration applied. Existing migration `0011` must be reviewed before production.
