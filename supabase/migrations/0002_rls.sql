-- 0002_rls.sql
-- Row Level Security + helper functions.

-- =========================================================
-- Helper functions (security definer avoids recursive policies)
-- =========================================================

create or replace function public.is_business_member(b_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = b_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_business_owner(b_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.business_members
    where business_id = b_id
      and user_id = auth.uid()
      and role = 'owner'
      and status = 'active'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- =========================================================
-- Enable RLS on every table
-- =========================================================

alter table public.profiles            enable row level security;
alter table public.admin_users         enable row level security;
alter table public.businesses          enable row level security;
alter table public.business_members    enable row level security;
alter table public.subscription_plans  enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.locations           enable row level security;
alter table public.services            enable row level security;
alter table public.staff               enable row level security;
alter table public.staff_services      enable row level security;
alter table public.staff_locations     enable row level security;
alter table public.business_hours      enable row level security;
alter table public.staff_hours         enable row level security;
alter table public.staff_time_off      enable row level security;
alter table public.business_closures   enable row level security;
alter table public.customers           enable row level security;
alter table public.appointments        enable row level security;
alter table public.appointment_events  enable row level security;
alter table public.payments            enable row level security;
alter table public.notifications       enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.support_requests    enable row level security;

-- =========================================================
-- profiles
-- =========================================================
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_super_admin());

drop policy if exists profiles_upsert_own on public.profiles;
create policy profiles_upsert_own on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- =========================================================
-- admin_users (only super admins can read; only service role writes)
-- =========================================================
drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users
  for select using (public.is_super_admin());

-- =========================================================
-- businesses
-- =========================================================
drop policy if exists businesses_select_member on public.businesses;
create policy businesses_select_member on public.businesses
  for select using (public.is_business_member(id) or public.is_super_admin());

drop policy if exists businesses_insert_self on public.businesses;
create policy businesses_insert_self on public.businesses
  for insert with check (auth.uid() is not null and created_by = auth.uid());

drop policy if exists businesses_update_owner on public.businesses;
create policy businesses_update_owner on public.businesses
  for update using (public.is_business_owner(id) or public.is_super_admin())
  with check (public.is_business_owner(id) or public.is_super_admin());

-- =========================================================
-- business_members
-- =========================================================
drop policy if exists business_members_select on public.business_members;
create policy business_members_select on public.business_members
  for select using (
    user_id = auth.uid()
    or public.is_business_member(business_id)
    or public.is_super_admin()
  );

drop policy if exists business_members_insert on public.business_members;
create policy business_members_insert on public.business_members
  for insert with check (
    -- allow a user to add themselves as the initial owner
    (user_id = auth.uid() and role = 'owner' and status = 'active')
    -- or an existing owner of the business can add others
    or public.is_business_owner(business_id)
    or public.is_super_admin()
  );

drop policy if exists business_members_update on public.business_members;
create policy business_members_update on public.business_members
  for update using (
    public.is_business_owner(business_id) or public.is_super_admin()
  )
  with check (
    public.is_business_owner(business_id) or public.is_super_admin()
  );

drop policy if exists business_members_delete on public.business_members;
create policy business_members_delete on public.business_members
  for delete using (
    public.is_business_owner(business_id) or public.is_super_admin()
  );

-- =========================================================
-- subscription_plans (public read for pricing)
-- =========================================================
drop policy if exists subscription_plans_select on public.subscription_plans;
create policy subscription_plans_select on public.subscription_plans
  for select using (is_active = true or public.is_super_admin());

drop policy if exists subscription_plans_write on public.subscription_plans;
create policy subscription_plans_write on public.subscription_plans
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- =========================================================
-- subscriptions (business owner read; service-role writes)
-- =========================================================
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select using (
    public.is_business_member(business_id) or public.is_super_admin()
  );

-- =========================================================
-- Generic pattern helper for business-scoped tables
-- (policies per table below reference is_business_member/owner)
-- =========================================================

-- locations
drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select using (public.is_business_member(business_id) or public.is_super_admin());

drop policy if exists locations_write on public.locations;
create policy locations_write on public.locations
  for all using (public.is_business_member(business_id) or public.is_super_admin())
  with check (public.is_business_member(business_id) or public.is_super_admin());

-- services
drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select using (public.is_business_member(business_id) or public.is_super_admin());

drop policy if exists services_write on public.services;
create policy services_write on public.services
  for all using (public.is_business_member(business_id) or public.is_super_admin())
  with check (public.is_business_member(business_id) or public.is_super_admin());

-- staff
drop policy if exists staff_select on public.staff;
create policy staff_select on public.staff
  for select using (public.is_business_member(business_id) or public.is_super_admin());

drop policy if exists staff_write on public.staff;
create policy staff_write on public.staff
  for all using (public.is_business_owner(business_id) or public.is_super_admin())
  with check (public.is_business_owner(business_id) or public.is_super_admin());

-- staff_services
drop policy if exists staff_services_select on public.staff_services;
create policy staff_services_select on public.staff_services
  for select using (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  );

drop policy if exists staff_services_write on public.staff_services;
create policy staff_services_write on public.staff_services
  for all using (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_owner(s.business_id))
    or public.is_super_admin()
  )
  with check (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_owner(s.business_id))
    or public.is_super_admin()
  );

-- staff_locations
drop policy if exists staff_locations_select on public.staff_locations;
create policy staff_locations_select on public.staff_locations
  for select using (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  );

drop policy if exists staff_locations_write on public.staff_locations;
create policy staff_locations_write on public.staff_locations
  for all using (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_owner(s.business_id))
    or public.is_super_admin()
  )
  with check (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_owner(s.business_id))
    or public.is_super_admin()
  );

-- business_hours
drop policy if exists business_hours_select on public.business_hours;
create policy business_hours_select on public.business_hours
  for select using (public.is_business_member(business_id) or public.is_super_admin());

drop policy if exists business_hours_write on public.business_hours;
create policy business_hours_write on public.business_hours
  for all using (public.is_business_member(business_id) or public.is_super_admin())
  with check (public.is_business_member(business_id) or public.is_super_admin());

-- staff_hours
drop policy if exists staff_hours_select on public.staff_hours;
create policy staff_hours_select on public.staff_hours
  for select using (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  );

drop policy if exists staff_hours_write on public.staff_hours;
create policy staff_hours_write on public.staff_hours
  for all using (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  )
  with check (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  );

-- staff_time_off
drop policy if exists staff_time_off_select on public.staff_time_off;
create policy staff_time_off_select on public.staff_time_off
  for select using (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  );

drop policy if exists staff_time_off_write on public.staff_time_off;
create policy staff_time_off_write on public.staff_time_off
  for all using (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  )
  with check (
    exists (select 1 from public.staff s
            where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  );

-- business_closures
drop policy if exists business_closures_select on public.business_closures;
create policy business_closures_select on public.business_closures
  for select using (public.is_business_member(business_id) or public.is_super_admin());

drop policy if exists business_closures_write on public.business_closures;
create policy business_closures_write on public.business_closures
  for all using (public.is_business_member(business_id) or public.is_super_admin())
  with check (public.is_business_member(business_id) or public.is_super_admin());

-- customers
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select using (
    public.is_business_member(business_id)
    or user_id = auth.uid()
    or public.is_super_admin()
  );

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert with check (
    public.is_business_member(business_id)
    or public.is_super_admin()
    -- a signed-in customer can create their own record at a business
    or (auth.uid() is not null and user_id = auth.uid())
  );

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update using (
    public.is_business_member(business_id)
    or user_id = auth.uid()
    or public.is_super_admin()
  )
  with check (
    public.is_business_member(business_id)
    or user_id = auth.uid()
    or public.is_super_admin()
  );

-- appointments
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select using (
    public.is_business_member(business_id)
    or exists (select 1 from public.customers c
               where c.id = customer_id and c.user_id = auth.uid())
    or public.is_super_admin()
  );

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments
  for insert with check (
    public.is_business_member(business_id) or public.is_super_admin()
  );

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments
  for update using (
    public.is_business_member(business_id) or public.is_super_admin()
  )
  with check (
    public.is_business_member(business_id) or public.is_super_admin()
  );

-- appointment_events
drop policy if exists appointment_events_select on public.appointment_events;
create policy appointment_events_select on public.appointment_events
  for select using (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (
          public.is_business_member(a.business_id)
          or exists (select 1 from public.customers c
                     where c.id = a.customer_id and c.user_id = auth.uid())
          or public.is_super_admin()
        )
    )
  );

drop policy if exists appointment_events_insert on public.appointment_events;
create policy appointment_events_insert on public.appointment_events
  for insert with check (
    exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and (public.is_business_member(a.business_id) or public.is_super_admin())
    )
  );

-- payments
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select using (public.is_business_member(business_id) or public.is_super_admin());

drop policy if exists payments_write on public.payments;
create policy payments_write on public.payments
  for all using (public.is_business_member(business_id) or public.is_super_admin())
  with check (public.is_business_member(business_id) or public.is_super_admin());

-- notifications
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (public.is_business_member(business_id) or public.is_super_admin());

drop policy if exists notifications_write on public.notifications;
create policy notifications_write on public.notifications
  for all using (public.is_business_member(business_id) or public.is_super_admin())
  with check (public.is_business_member(business_id) or public.is_super_admin());

-- audit_logs (business owner can read own; only super admin can read all)
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select using (
    public.is_super_admin()
    or (business_id is not null and public.is_business_owner(business_id))
  );

-- support_requests
drop policy if exists support_requests_select on public.support_requests;
create policy support_requests_select on public.support_requests
  for select using (
    user_id = auth.uid()
    or (business_id is not null and public.is_business_member(business_id))
    or public.is_super_admin()
  );

drop policy if exists support_requests_insert on public.support_requests;
create policy support_requests_insert on public.support_requests
  for insert with check (
    auth.uid() is not null
    and (user_id is null or user_id = auth.uid())
  );

drop policy if exists support_requests_update on public.support_requests;
create policy support_requests_update on public.support_requests
  for update using (public.is_super_admin())
  with check (public.is_super_admin());
