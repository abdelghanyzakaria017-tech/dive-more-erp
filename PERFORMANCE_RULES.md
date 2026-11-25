# Dive More ERP — Performance Rules / قواعد الأداء

Source: Facebook reel by Ahmed Ashraf, extracted 2026-11-20 — "الـ AI بنالك
الموقع وشغال… بس فيه 5 حاجات مابيعملهاش لوحده" (comment "سبيت" to get the
rules file). These are those 5 rules, adapted to Dive More ERP v20 instead
of copied generically.

Applies to: React + TypeScript + Vite frontend, Supabase / PostgreSQL
backend (planned), API mode via `VITE_API_URL`, demo mode with localStorage.
Note: the current Phase 49 branch holds login / forgot-password / change
password only — there are no booking lists, DB queries or images in it yet,
so these rules are for the screens and server code as they come back, not a
fix for existing violations.

## 1. Database — indexes + no N+1 / الداتابيز
- Index every column a list is filtered or searched by: bookings by
  `date`, `resource`, `status`; customers by name/phone; payments by
  `booking_id` and `status`.
- Never loop queries: one query per row (N+1) is forbidden. Fetch a list
  and its related rows in one query / join / RPC (e.g. bookings + customer
  + payments together), and `select` only the columns the screen uses.
- Before adding a new list query, check `EXPLAIN` — a full table scan on a
  growing bookings table is a bug, not a TODO.

## 2. Pagination — 20 at a time / الباجينيشن
- Every list (bookings, availability, payments, customers) is server-side
  paginated, 20 rows per page. Never fetch thousands of rows and render
  them all.
- Supabase: use `.range(from, to)` / `limit(20)` with an explicit order.
  The UI pages forward/back; it never holds the whole table in memory.

## 3. Images — compress, resize, WebP, lazy / الصور
- Never display an uploaded photo at its original size. Diver photos and
  any uploaded images are resized to the display size, compressed and
  stored/served as WebP before they reach a list.
- A 5–10 MB original must never be sent to a phone on a dive-boat
  connection. Add `loading="lazy"` so images load only when the user
  scrolls to them.

## 4. Caching — don't hit the DB for static data / الكاشينج
- Data that rarely changes (exchange rates, roles, lookup lists, static
  settings) is cached — it is not re-fetched from the database on every
  screen or render. Invalidate the cache when the data actually changes.
- Today exchange rates live in localStorage on one browser only; when they
  move to the server, cache them per session, don't query per row.

## 5. Skeleton loading — never a blank white screen / الاسكيليتون
- While a list or screen is loading, show skeleton placeholders in the
  shape of the page (like Facebook), not a blank white screen. The user
  must never think the app hung while data is on its way.
- Applies to: booking list, availability view, finance reports, login
  workspace after sign-in.

## Review checklist (before any merge)
- [ ] New list query has an index on its filter/search columns.
- [ ] No query inside a loop; related data comes in one query/RPC.
- [ ] List is paginated at 20/page, server-side.
- [ ] Images are resized + WebP + lazy-loaded.
- [ ] Static data is cached, with an invalidation point.
- [ ] Loading state is a skeleton, not a blank screen.
