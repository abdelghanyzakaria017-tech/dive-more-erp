# Phase 20 — Bonus and Commission Role Separation

## Demo role matrix

| Role | Sales Bonus section | Edit/approve bonus | Monthly commission section | Commission FX rates |
|---|---|---|---|---|
| Accountant (`accountant@...`) | Yes | Yes | No | No |
| Accounting Manager (`accountingmanager@...`, `accounting.manager@...`, `accounting-manager@...`) | View only | No | No | No |
| Finance Manager (`finance@...`) | No | No | Yes, monthly aggregated by month and salesperson | Yes |
| Owner (`owner@...`) | View only | No | Yes | View/edit in demo |
| Sales, Operations, all other roles | No | No | No | No |

The app navigation and page rendering are gated by role, and the bonus/rate save functions also check the role. This is still a local demo: the email-to-role mapping is inferred from the email text, and localStorage is not secure authorization. Before production, roles must come from authenticated server-side claims and API/database policies must enforce the same permissions.
