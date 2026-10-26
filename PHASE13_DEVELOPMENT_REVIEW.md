# Dive More ERP — Development Review

## Changes in this pass
- Sales serial preview now uses up to four characters from the login name rather than only two, reducing collisions between similar salesperson names in the local demo.
- Removed the misspelled `Supper Safari` entry from the P Transfer eligibility list; the service catalog continues to use `Super Safari`.
- Booking validation now requires a positive, finite ticket total before creating a booking.
- Preserved the five-language selector, RTL handling for Arabic, Excel-derived service detail suggestions, and the finance/owner-only Extra Dive and Extra Camera options.

## Current limits
- This is still a local demo. The login form only selects a demo role based on the email text; it is not authentication.
- Booking records and exchange rates are stored in the current browser only. They are not synchronized between sales tablets.
- Browser-side role checks are not security controls. Finance-only permissions must be enforced by Supabase Auth, database policies, and server-side operations before real data is used.
- Serial allocation is not globally unique across devices until it is moved to an atomic server-side sequence.
- Availability is illustrative and does not prevent double-booking without database-level resource locks.

## Verification
Run from `dm-phase2` after installing dependencies:

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

The build could not be verified in the build environment because dependency installation timed out and React was unavailable. Do not treat this package as production-ready until the commands above pass and backend authentication, persistence, permissions, serial allocation, and booking/refund transactions are implemented and tested.
