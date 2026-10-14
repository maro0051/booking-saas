-- 0034_staff_accounts.sql
-- Staff portal backend: time-off requests, self-service RPCs, and RLS
-- for staff members accessing their own data.

-- =========================================================
-- 1. time_off_requests
-- =========================================================

create table if not exists public.time_off_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  requested_by uuid references auth.users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  status text not null default 'pending'
    check (status in ('pending','approved','denied','cancelled')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create index if not exists time_off_requests_staff_idx
  on public.time_off_requests (staff_id, status, starts_at desc);
create index if not exists time_off_requests_business_idx
  on public.time_off_requests (business_id, status, created_at desc);

alter table public.time_off_requests enable row level security;

-- =========================================================
-- 2. Triggers
-- =========================================================

-- updated_at
drop trigger if exists set_updated_at on public.time_off_requests;
create trigger set_updated_at before update on public.time_off_requests
  for each row execute procedure public.set_updated_at();

-- On approval, insert into staff_time_off (delete on un-approval)
create or replace function public.tg_time_off_request_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and (old.status is null or old.status <> 'approved') then
    -- Avoid duplicates if the trigger fires twice
    if not exists (
      select 1 from public.staff_time_off
      where staff_id = new.staff_id
        and starts_at = new.starts_at
        and ends_at = new.ends_at
    ) then
      insert into public.staff_time_off (staff_id, starts_at, ends_at, reason)
      values (new.staff_id, new.starts_at, new.ends_at, coalesce(new.reason, 'Time off request'));
    end if;
  end if;

  if tg_op = 'UPDATE' and old.status = 'approved' and new.status <> 'approved' then
    delete from public.staff_time_off
    where staff_id = new.staff_id
      and starts_at = new.starts_at
      and ends_at = new.ends_at;
  end if;

  return new;
end;
$$;

drop trigger if exists time_off_request_apply on public.time_off_requests;
create trigger time_off_request_apply
  after insert or update on public.time_off_requests
  for each row execute procedure public.tg_time_off_request_apply();

-- =========================================================
-- 3. Helper: resolve signed-in staff + business
-- =========================================================

create or replace function public.my_staff_row()
returns table (
  staff_id uuid,
  business_id uuid,
  display_name text,
  business_name text,
  business_timezone text,
  business_slug text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    s.id,
    s.business_id,
    s.display_name,
    b.name,
    b.timezone,
    b.slug
  from public.staff s
  join public.businesses b on b.id = s.business_id
  where s.user_id = auth.uid()
    and s.is_active = true
  limit 1;
$$;

revoke all on function public.my_staff_row() from public;
grant execute on function public.my_staff_row() to authenticated;

-- =========================================================
-- 4. Staff-scoped read RPCs
-- =========================================================

-- Bookings assigned to me
create or replace function public.staff_my_bookings(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  id uuid,
  reference text,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  service_name text,
  customer_name text,
  customer_email text,
  location_name text,
  notes text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_staff uuid;
begin
  select staff_id into v_staff from public.my_staff_row();
  if v_staff is null then
    raise exception 'not a staff member' using errcode = '42501';
  end if;

  return query
  select
    a.id,
    a.reference::text,
    a.status::text,
    a.starts_at,
    a.ends_at,
    s.name::text,
    c.full_name::text,
    c.email::text,
    l.name::text,
    a.notes::text
  from public.appointments a
  join public.services s on s.id = a.service_id
  join public.customers c on c.id = a.customer_id
  left join public.locations l on l.id = a.location_id
  where a.staff_id = v_staff
    and a.starts_at >= p_from
    and a.starts_at < p_to
  order by a.starts_at;
end;
$$;

revoke all on function public.staff_my_bookings(timestamptz, timestamptz) from public;
grant execute on function public.staff_my_bookings(timestamptz, timestamptz) to authenticated;

-- My working hours (raw rows for the current weekday set)
create or replace function public.staff_my_hours()
returns table (
  id uuid,
  weekday smallint,
  start_time time,
  end_time time,
  location_id uuid
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_staff uuid;
begin
  select staff_id into v_staff from public.my_staff_row();
  if v_staff is null then
    raise exception 'not a staff member' using errcode = '42501';
  end if;

  return query
  select sh.id, sh.weekday, sh.start_time, sh.end_time, sh.location_id
  from public.staff_hours sh
  where sh.staff_id = v_staff
  order by sh.weekday, sh.start_time;
end;
$$;

revoke all on function public.staff_my_hours() from public;
grant execute on function public.staff_my_hours() to authenticated;

-- Business opening hours (so the staff editor can constrain the pickers)
create or replace function public.staff_business_hours()
returns table (
  weekday smallint,
  open_time time,
  close_time time
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_business uuid;
begin
  select business_id into v_business from public.my_staff_row();
  if v_business is null then
    raise exception 'not a staff member' using errcode = '42501';
  end if;

  return query
  select bh.weekday, bh.open_time, bh.close_time
  from public.business_hours bh
  where bh.business_id = v_business
  order by bh.weekday;
end;
$$;

revoke all on function public.staff_business_hours() from public;
grant execute on function public.staff_business_hours() to authenticated;

-- My time-off requests
create or replace function public.staff_my_time_off_requests()
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  reason text,
  status text,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_staff uuid;
begin
  select staff_id into v_staff from public.my_staff_row();
  if v_staff is null then
    raise exception 'not a staff member' using errcode = '42501';
  end if;

  return query
  select r.id, r.starts_at, r.ends_at, r.reason, r.status,
         r.reviewed_at, r.review_notes, r.created_at
  from public.time_off_requests r
  where r.staff_id = v_staff
  order by r.created_at desc;
end;
$$;

revoke all on function public.staff_my_time_off_requests() from public;
grant execute on function public.staff_my_time_off_requests() to authenticated;

-- =========================================================
-- 5. Staff-scoped write RPCs
-- =========================================================

-- Replace all working hours for the signed-in staff member.
-- Each row is validated against the business opening hours for that weekday.
create or replace function public.staff_replace_my_hours(p_hours jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid;
  v_business uuid;
  v_count int := 0;
  v_row jsonb;
  v_weekday int;
  v_start time;
  v_end time;
  v_bh_open time;
  v_bh_close time;
begin
  select staff_id, business_id into v_staff, v_business from public.my_staff_row();
  if v_staff is null then
    raise exception 'not a staff member' using errcode = '42501';
  end if;

  -- Wipe existing hours for this staff member.
  delete from public.staff_hours where staff_id = v_staff;

  for v_row in select * from jsonb_array_elements(coalesce(p_hours, '[]'::jsonb))
  loop
    v_weekday := (v_row->>'weekday')::int;
    v_start := (v_row->>'start_time')::time;
    v_end := (v_row->>'end_time')::time;

    if v_weekday < 0 or v_weekday > 6 then
      raise exception 'invalid weekday' using errcode = '22023';
    end if;
    if v_start >= v_end then
      raise exception 'start must be before end' using errcode = '22023';
    end if;

    -- Respect business hours for that weekday (if any are defined)
    select bh.open_time, bh.close_time into v_bh_open, v_bh_close
    from public.business_hours bh
    where bh.business_id = v_business and bh.weekday = v_weekday
    order by bh.open_time asc
    limit 1;

    if v_bh_open is not null then
      if v_start < v_bh_open or v_end > v_bh_close then
        raise exception 'hours outside business opening (% - %)',
          v_bh_open, v_bh_close using errcode = '22023';
      end if;
    end if;

    insert into public.staff_hours (staff_id, weekday, start_time, end_time)
    values (v_staff, v_weekday, v_start, v_end);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.staff_replace_my_hours(jsonb) from public;
grant execute on function public.staff_replace_my_hours(jsonb) to authenticated;

-- Create a time-off request (must be at least 24h in the future).
create or replace function public.staff_request_time_off(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text default null
)
returns public.time_off_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid;
  v_business uuid;
  v_row public.time_off_requests;
begin
  select staff_id, business_id into v_staff, v_business from public.my_staff_row();
  if v_staff is null then
    raise exception 'not a staff member' using errcode = '42501';
  end if;

  if p_starts_at is null or p_ends_at is null then
    raise exception 'starts_at and ends_at required' using errcode = '22023';
  end if;
  if p_starts_at >= p_ends_at then
    raise exception 'start must be before end' using errcode = '22023';
  end if;
  if p_starts_at < now() + interval '24 hours' then
    raise exception 'requests must start at least 24 hours in advance'
      using errcode = '22023';
  end if;

  insert into public.time_off_requests
    (business_id, staff_id, requested_by, starts_at, ends_at, reason)
  values
    (v_business, v_staff, auth.uid(), p_starts_at, p_ends_at, nullif(p_reason,''))
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.staff_request_time_off(timestamptz, timestamptz, text) from public;
grant execute on function public.staff_request_time_off(timestamptz, timestamptz, text) to authenticated;

-- Cancel my own pending request
create or replace function public.staff_cancel_time_off(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid;
begin
  select staff_id into v_staff from public.my_staff_row();
  if v_staff is null then
    raise exception 'not a staff member' using errcode = '42501';
  end if;

  update public.time_off_requests
  set status = 'cancelled', updated_at = now()
  where id = p_id
    and staff_id = v_staff
    and status = 'pending';

  if not found then
    raise exception 'request not found or not cancellable' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.staff_cancel_time_off(uuid) from public;
grant execute on function public.staff_cancel_time_off(uuid) to authenticated;

-- =========================================================
-- 6. Business owner: list and review time-off requests
-- =========================================================

create or replace function public.business_list_time_off_requests(
  p_business_id uuid,
  p_status text default null
)
returns table (
  id uuid,
  staff_id uuid,
  staff_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  reason text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select r.id, r.staff_id, s.display_name,
         r.starts_at, r.ends_at, r.reason, r.status, r.created_at
  from public.time_off_requests r
  join public.staff s on s.id = r.staff_id
  where r.business_id = p_business_id
    and (p_status is null or p_status = '' or r.status = p_status)
  order by r.created_at desc;
end;
$$;

revoke all on function public.business_list_time_off_requests(uuid, text) from public;
grant execute on function public.business_list_time_off_requests(uuid, text) to authenticated;

create or replace function public.business_review_time_off(
  p_request_id uuid,
  p_decision text,   -- 'approved' or 'denied'
  p_notes text default null
)
returns public.time_off_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.time_off_requests;
begin
  if p_decision not in ('approved','denied') then
    raise exception 'invalid decision' using errcode = '22023';
  end if;

  select * into v_row from public.time_off_requests where id = p_request_id;
  if v_row is null then
    raise exception 'not found' using errcode = '22023';
  end if;
  if not public.is_business_member(v_row.business_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'request already reviewed' using errcode = '22023';
  end if;

  update public.time_off_requests
  set status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = nullif(p_notes,''),
      updated_at = now()
  where id = p_request_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.business_review_time_off(uuid, text, text) from public;
grant execute on function public.business_review_time_off(uuid, text, text) to authenticated;

-- =========================================================
-- 7. RLS for time_off_requests
-- =========================================================

drop policy if exists "staff can read own requests" on public.time_off_requests;
create policy "staff can read own requests" on public.time_off_requests
  for select using (
    requested_by = auth.uid()
    or exists (
      select 1 from public.staff s
      where s.id = staff_id and s.user_id = auth.uid()
    )
    or public.is_business_member(business_id)
    or public.is_super_admin()
  );

drop policy if exists "business can update requests" on public.time_off_requests;
create policy "business can update requests" on public.time_off_requests
  for update using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

-- =========================================================
-- 8. RLS for staff to read their own rows on shared tables
-- =========================================================

-- staff: read self
drop policy if exists staff_select_self on public.staff;
create policy staff_select_self on public.staff
  for select using (
    user_id = auth.uid()
    or public.is_business_member(business_id)
    or public.is_super_admin()
  );

-- staff_hours: staff read own
drop policy if exists staff_hours_select_self on public.staff_hours;
create policy staff_hours_select_self on public.staff_hours
  for select using (
    exists (select 1 from public.staff s where s.id = staff_id and s.user_id = auth.uid())
    or exists (select 1 from public.staff s
               where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  );

-- staff_time_off: staff read own
drop policy if exists staff_time_off_select_self on public.staff_time_off;
create policy staff_time_off_select_self on public.staff_time_off
  for select using (
    exists (select 1 from public.staff s where s.id = staff_id and s.user_id = auth.uid())
    or exists (select 1 from public.staff s
               where s.id = staff_id and public.is_business_member(s.business_id))
    or public.is_super_admin()
  );

-- appointments: staff can read their own
drop policy if exists appointments_select_staff on public.appointments;
create policy appointments_select_staff on public.appointments
  for select using (
    public.is_business_member(business_id)
    or exists (select 1 from public.staff s
               where s.id = staff_id and s.user_id = auth.uid())
    or exists (select 1 from public.customers c
               where c.id = customer_id and c.user_id = auth.uid())
    or public.is_super_admin()
  );