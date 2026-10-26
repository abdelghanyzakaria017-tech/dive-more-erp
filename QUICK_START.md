# Dive More ERP — Quick Start

## Run the demo

1. Extract this folder to a normal local folder (not inside Visual Studio's `.vs` folder).
2. Open `dm-phase2` in VS Code.
3. In Terminal, run:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

4. Keep the terminal open and open the Local URL printed by Vite.
5. In the demo login, use an email containing `finance` or `owner` to preview Finance screens; use any email containing `sales` to preview Sales; use `operation` for Operations. Password is only a demo field and is not authenticated by a real identity provider.

## Payment verification demo

- Open **مراجعة التحصيلات / Payment verification** using Finance or Owner.
- Review payments reported by Sales. Confirm only the amount actually verified. Visa needs a receipt/transaction reference.
- For cash, use **استلام بالخزينة / Receive into treasury** only when cash is physically received from Sales.
- Partial confirmation and partial handover are supported; each currency remains separate.
- Unverified or rejected amounts are not refundable in the updated demo logic.

## Production warning

The app is still a local demo. The payment workflow writes to browser storage only. Migration `supabase/migrations/0008_finance_payment_verification.sql` is a proposed database migration and must be tested in a disposable Supabase project, reviewed, then applied intentionally. The frontend must be connected to authenticated server-side RPCs before live use. Do not use demo numbers as real financial records.
