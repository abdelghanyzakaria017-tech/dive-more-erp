# Phase 37 — OHANAA wordmark and Owner/Admin audit trail

- Increased the `& OHANAA` wordmark size and corrected spelling to two trailing A characters.
- Added an Audit log navigation item visible only to Owner and Admin.
- Audit records successful demo logins, booking creation, booking status changes, payment verification/rejection/cash handover, refunds, sales bonus approval, serial range changes, and vessel assignment/closure/reopening.
- Audit log is saved to browser localStorage and can be exported as JSON.

## Important limitation
This is a local demo audit log, not a tamper-resistant production audit trail. A production version should write append-only audit events on the server with authenticated actor IDs, server timestamps, and authorization enforced server-side.

## Motion reference
The Facebook share URL did not expose the video contents in the available browser session. Existing ocean/glow/bubble motion remains in the login screen, and the wordmark has been emphasized. To recreate the exact timing and transitions from that video, provide the video file or a screen recording.
