-- 0001_init.sql
-- Core schema: identity, tenancy, catalog, availability, appointments,
-- payments, notifications, platform ops.

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "btree_gist";

-- =========================================================
-- Identity & tenancy
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  full_name text,
  phone text,
  avatar_url text,
  locale text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now(),
  notes text
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  name text not null,
  description text,
  logo_url text,
  contact_email citext,
  contact_phone text,
  timezone text not null default 'America/Toronto',
  currency text not null default 'CAD',
  locale text not null default 'en',
  address jsonb,
  status text not null default 'pending'
    check (status in ('pending','active','suspended','closed')),
  onboarding_completed boolean not null default false,
  guest_booking_enabled boolean not null default true,
  min_notice_minutes int not null default 60,
  max_advance_days int not null default 90,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists businesses_status_idx on public.businesses (status);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff','manager')),
  status text not null default 'active'
    check (status in ('active','invited','disabled')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists business_members_user_idx on public.business_members (user_id);

-- =========================================================
-- Subscriptions
-- =========================================================

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  interval text not null check (interval in ('month','year','none')),
  price_cents int not null default 0,
  currency text not null default 'CAD',
  stripe_price_id text,
  max_staff int,
  max_services int,
  max_locations int,
  max_appointments_per_month int,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null check (status in
    ('trialing','active','past_due','canceled','incomplete','unpaid')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_business_status_idx
  on public.subscriptions (business_id, status);

-- =========================================================
-- Catalog
-- =========================================================

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  address jsonb,
  phone text,
  timezone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists locations_business_idx on public.locations (business_id);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null check (duration_minutes > 0),
  buffer_before_minutes int not null default 0,
  buffer_after_minutes int not null default 0,
  price_cents int not null default 0,
  deposit_cents int not null default 0,
  currency text,
  online_booking_enabled boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists services_business_active_idx
  on public.services (business_id, is_active);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id),
  display_name text not null,
  email citext,
  phone text,
  title text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists staff_business_idx on public.staff (business_id);

create table if not exists public.staff_services (
  staff_id uuid not null references public.staff(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (staff_id, service_id)
);

create table if not exists public.staff_locations (
  staff_id uuid not null references public.staff(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  primary key (staff_id, location_id)
);

-- =========================================================
-- Availability
-- =========================================================

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time not null,
  close_time time not null,
  check (open_time < close_time)
);
create index if not exists business_hours_biz_weekday_idx
  on public.business_hours (business_id, weekday);

create table if not exists public.staff_hours (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);

create table if not exists public.staff_time_off (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (starts_at < ends_at)
);
create index if not exists staff_time_off_staff_idx
  on public.staff_time_off (staff_id, starts_at);

create table if not exists public.business_closures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  check (starts_at < ends_at)
);
create index if not exists business_closures_biz_idx
  on public.business_closures (business_id, starts_at);

-- =========================================================
-- Customers
-- =========================================================

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id),
  full_name text not null,
  email citext,
  phone text,
  notes text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists customers_biz_email_unique
  on public.customers (business_id, lower(email))
  where email is not null;
create index if not exists customers_business_idx on public.customers (business_id);
create index if not exists customers_user_idx on public.customers (user_id);

-- =========================================================
-- Appointments
-- =========================================================

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id),
  service_id uuid not null references public.services(id),
  staff_id uuid references public.staff(id),
  customer_id uuid not null references public.customers(id),
  reference text unique not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','declined','cancelled',
                      'completed','no_show')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes int not null,
  price_cents int not null,
  currency text not null,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','deposit_paid','paid','refunded')),
  created_via text not null default 'public'
    check (created_via in ('public','business','admin')),
  created_by uuid references auth.users(id),
  notes text,
  internal_notes text,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);
create index if not exists appointments_business_starts_idx
  on public.appointments (business_id, starts_at);
create index if not exists appointments_staff_starts_idx
  on public.appointments (staff_id, starts_at);
create index if not exists appointments_customer_idx
  on public.appointments (customer_id);
create index if not exists appointments_status_idx
  on public.appointments (status);

-- Overlap prevention: same staff, overlapping time window, non-cancelled.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_no_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_overlap
      exclude using gist (
        staff_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('pending','confirmed'));
  end if;
end $$;

create table if not exists public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id),
  actor_kind text not null check (actor_kind in ('customer','business','admin','system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists appointment_events_appt_idx
  on public.appointment_events (appointment_id, created_at);

-- =========================================================
-- Payments & notifications
-- =========================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  amount_cents int not null,
  currency text not null,
  kind text not null check (kind in ('deposit','full','refund','manual')),
  source text not null check (source in ('stripe','cash','manual','other')),
  status text not null check (status in
    ('pending','succeeded','failed','refunded')),
  stripe_payment_intent_id text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists payments_business_created_idx
  on public.payments (business_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  recipient_email citext,
  recipient_user_id uuid references auth.users(id),
  channel text not null check (channel in ('email','sms','in_app')),
  template text not null,
  status text not null default 'queued'
    check (status in ('queued','sent','failed')),
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- =========================================================
-- Platform ops
-- =========================================================

create table if not exists public.audit_logs (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id),
  actor_role text,
  business_id uuid references public.businesses(id) on delete set null,
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_business_idx
  on public.audit_logs (business_id, created_at);
create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_user_id, created_at);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references auth.users(id),
  subject text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open','in_progress','resolved','closed')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
