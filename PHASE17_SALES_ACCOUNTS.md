# Sales Accounts and Automatic Ticket Attribution

- Each salesperson signs in using an individual account, e.g. `omar-sales@divemore.com`.
- The ticket captures the signed-in email, display name, and two-character sales code automatically; sales cannot edit these fields in the ticket form.
- Finance assigns a serial range to a specific salesperson account, not to a free-typed code. The demo account list currently includes Omar, Adam, Ehab, Sadam, Misha, and Amr.
- The serial is allocated from the range assigned to the active salesperson. The ticket and booking list display the salesperson name and account email.
- Finance remains the only role allowed to change ranges in the UI. Range overlap and already-used ticket numbers are checked in the demo.

## Demo account examples

- `other-sales@divemore.com` → other / OT
- `adam-sales@divemore.com` → Adam / AD
- `ehab-sales@divemore.com` → Ehab / EH
- `sadam-sales@divemore.com` → Sadam / SA
- `misha-sales@divemore.com` → Misha / MI
- `amr-sales@divemore.com` → Amr / AM

These are illustrative account names for the prototype, not provisioned mailboxes. Login remains a role-preview form until Supabase Auth is configured. Do not treat the client-side role selection or localStorage ranges as security controls. Production must create each user in Supabase Auth, set `profiles.role = 'sales'`, assign the range through the finance-only RPC, and allocate the next serial transactionally on the server.
