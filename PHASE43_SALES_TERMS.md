# Phase 43 — Sales Terms & Conditions

- Added a Sales-only terms and conditions checkbox beside the ticket serial field.
- Added a compact modal opened by a small terms link.
- Added language-specific text for Arabic, English, German, Russian, and Chinese.
- Sales cannot submit a new booking without accepting the terms; the form and booking handler both enforce acceptance.
- Booking record stores `termsAccepted` and `termsAcceptedAt` for the current local/demo workflow.
- Terms acceptance is currently stored with the existing booking persistence. It is not yet guaranteed to be centrally persisted in PostgreSQL until the booking API integration is completed.

## Important content note
The Arabic policy supplied contains potentially conflicting timing rules (no refund during the first 24 hours from booking, alongside full refund within 6 hours). Text has been preserved in meaning and translated, not legally reconciled. The business should confirm the intended policy before production use.
