-- ============================================================
-- Dive More ERP v20 — Supabase Schema
-- سكيما Supabase لمشروع Dive More ERP
--
-- How to use / طريقة الاستخدام:
-- 1) Open your Supabase project -> SQL Editor -> New query
-- 2) Paste this whole file -> Run
-- 3) Done: tables, indexes, RLS and the auto-profile trigger are created.
--
-- Aligned with PERFORMANCE_RULES.md:
-- bookings indexed by date / resource / status, customers by name/phone,
-- payments by booking_id / status. Lists are fetched 20 per page with
-- .range() from the app side (rule 2), never the whole table.
-- ============================================================

-- ---------- Roles / الأدوار ----------
-- Same roles as the login screen (src/auth.ts):
-- owner, admin, accounting-manager, accountant, finance, operation, sales

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        text not null default 'sales'
              check (role in ('owner','admin','accounting-manager','accountant','finance','operation','sales')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up (Supabase Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Customers / العملاء ----------
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text,
  phone       text,
  nationality text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists customers_name_idx  on public.customers (full_name);
create index if not exists customers_phone_idx on public.customers (phone);
create index if not exists customers_email_idx on public.customers (email);

-- ---------- Resources / الموارد (مركب، مدرب، معدات) ----------
create table if not exists public.resources (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('boat','instructor','equipment')),
  capacity   integer,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists resources_type_active_idx on public.resources (type, active);

-- ---------- Services / الخدمات (كورسات، رحلات، أنشطة) ----------
create table if not exists public.services (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null check (category in ('course','trip','activity')),
  price      numeric(12,2) not null default 0,
  currency   text not null default 'USD',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists services_category_active_idx on public.services (category, active);

-- ---------- Bookings / الحجوزات ----------
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers (id),
  resource_id  uuid references public.resources (id),
  service_id   uuid references public.services (id),
  booking_date date not null,
  status       text not null default 'pending'
               check (status in ('pending','confirmed','completed','cancelled')),
  guests       integer not null default 1,
  total_amount numeric(12,2) not null default 0,
  currency     text not null default 'USD',
  notes        text,
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

-- PERFORMANCE_RULES rule 1: index what lists filter by (date / resource / status)
create index if not exists bookings_date_idx          on public.bookings (booking_date);
create index if not exists bookings_resource_date_idx on public.bookings (resource_id, booking_date);
create index if not exists bookings_status_idx        on public.bookings (status);
create index if not exists bookings_customer_idx      on public.bookings (customer_id);

-- ---------- Payments / المدفوعات ----------
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  amount      numeric(12,2) not null,
  currency    text not null default 'USD',
  method      text check (method in ('cash','card','bank_transfer','online')),
  status      text not null default 'paid'
              check (status in ('pending','paid','refunded')),
  paid_at     timestamptz not null default now(),
  recorded_by uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists payments_status_idx  on public.payments (status);

-- ---------- Exchange rates / أسعار الصرف ----------
-- PERFORMANCE_RULES rule 4: rarely-changing data, cache it in the app
-- per session instead of querying per row.
create table if not exists public.exchange_rates (
  id              uuid primary key default gen_random_uuid(),
  base_currency   text not null,
  target_currency text not null,
  rate            numeric(14,6) not null,
  updated_at      timestamptz not null default now(),
  unique (base_currency, target_currency)
);

-- ============================================================
-- Row Level Security / أمان الصفوف
-- Starter policies: any signed-in staff member can read and write.
-- Tighten later by role (e.g. only finance/accountant edit payments).
-- سياسات بداية: أي موظف مسجل دخول يقدر يقرأ ويكتب.
-- شدّدها بعدين حسب الدور (مثلاً المدفوعات للمالية والمحاسبة بس).
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.customers      enable row level security;
alter table public.resources      enable row level security;
alter table public.services       enable row level security;
alter table public.bookings       enable row level security;
alter table public.payments       enable row level security;
alter table public.exchange_rates enable row level security;

-- profiles: read all (staff list), update only your own row
drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select to authenticated using (true);
create policy "profiles update" on public.profiles for update to authenticated using (auth.uid() = id);

-- the rest: full access for authenticated staff (starter)
do $$
declare t text;
begin
  foreach t in array array['customers','resources','services','bookings','payments','exchange_rates']
  loop
    execute format('drop policy if exists "%s staff all" on public.%I', t, t);
    execute format('create policy "%s staff all" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- ============================================================
-- Next steps after running this / الخطوات اللي بعدها:
-- 1) Authentication -> Users -> Add user (your staff emails).
--    A profiles row is created automatically; set each role with:
--    update public.profiles set role = 'owner' where email = 'you@example.com';
-- 2) Project Settings -> API: copy the Project URL + anon key into the
--    app env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
-- 3) Lists in the app: always .order(...).range(from, to) with 20 per page,
--    and fetch bookings + customer + payments in ONE query (no N+1).
-- ============================================================
