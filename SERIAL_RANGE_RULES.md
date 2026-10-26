# Sales serial range assignment

- Finance alone can create or edit a salesperson's `from–to` range.
- Each sales code has one active range in the current demo interface.
- Ranges cannot overlap other salespeople's ranges, and issued serial numbers cannot be reassigned.
- Sales ticket creation must stop if that salesperson has no assigned range or the range is exhausted.
- Serial ranges in the current UI are stored in this browser only. This is a demo, not authoritative shared allocation.
- For production, apply migration `0009_finance_sales_serial_ranges.sql` to a test Supabase project, then wire the range form and ticket creation to authenticated server-side RPCs. Never allow direct client writes to the tables. The database transaction must allocate and reserve a serial atomically across all six tablets.
- `assign_sales_serial_range` deliberately allows only the `finance` role (not owner or sales) to modify ranges and requires a reason for every assignment/change.
