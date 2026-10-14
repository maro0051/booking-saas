-- 0012_calendar_analytics.sql
-- Data feeds for the calendar, dashboard summary, and analytics page,
-- plus a business-side appointment creation RPC that uses the same
-- concurrency lock as the public booking RPC.

-- =========================================================
-- Calendar feed
-- =========================================================

create or replace function public.business_appointments_range(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_staff_id uuid default null,
  p_location_id uuid default null,
  p_service_id uuid default null,
  p_status text default null
)
returns table (
  id uuid, reference text, status text,
  starts_at timestamptz, ends_at timestamptz,
  service_id uuid, service_name text,
  staff_id uuid, staff_name text, staff_color text,
  location_id uuid, location_name text,
  customer_id uuid, customer_name text, customer_email text, customer_phone text,
  price_cents int, currency text, notes text, internal_notes text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_business_member(p_business_id) and not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    a.id, a.reference, a.status,
    a.starts_at, a.ends_at,
    s.id, s.name,
    st.id, st.display_name, st.color,
    l.id, l.name,
    c.id, c.full_name, c.email, c.phone,
    a.price_cents, a.currency, a.notes, a.internal_notes
  from public.appointments a
  join public.services s on s.id = a.service_id
  join public.customers c on c.id = a.customer_id
  left join public.staff st on st.id = a.staff_id
  left join public.locations l on l.id = a.location_id
  where a.business_id = p_business_id
    and a.starts_at < p_to
    and a.ends_at > p_from
    and (p_staff_id is null or a.staff_id = p_staff_id)
    and (p_location_id is null or a.location_id = p_location_id)
    and (p_service_id is null or a.service_id = p_service_id)
    and (p_status is null or a.status = p_status)
  order by a.starts_at;
end;
$$;
revoke all on function public.business_appointments_range(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text) from public;
grant execute on function public.business_appointments_range(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text) to authenticated;

-- =========================================================
-- Dashboard summary
-- =========================================================

create or replace function public.business_dashboard_summary(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_tz text;
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_month_start timestamptz;
  v_prev_month_start timestamptz;
  v_result jsonb;
begin
  if not public.is_business_member(p_business_id) and not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select timezone into v_tz from public.businesses where id = p_business_id;
  v_today_start := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  v_today_end   := v_today_start + interval '1 day';
  v_month_start := date_trunc('month', now() at time zone v_tz) at time zone v_tz;
  v_prev_month_start := v_month_start - interval '1 month';

  select jsonb_build_object(
    'today_count', (
      select count(*) from public.appointments
      where business_id = p_business_id
        and status in ('pending','confirmed','completed')
        and starts_at >= v_today_start and starts_at < v_today_end
    ),
    'today_revenue_cents', (
      select coalesce(sum(price_cents),0) from public.appointments
      where business_id = p_business_id
        and status in ('confirmed','completed')
        and starts_at >= v_today_start and starts_at < v_today_end
    ),
    'pending_count', (
      select count(*) from public.appointments
      where business_id = p_business_id and status = 'pending'
    ),
    'upcoming_7d_count', (
      select count(*) from public.appointments
      where business_id = p_business_id
        and status in ('pending','confirmed')
        and starts_at >= now() and starts_at < now() + interval '7 days'
    ),
    'month_revenue_cents', (
      select coalesce(sum(price_cents),0) from public.appointments
      where business_id = p_business_id
        and status in ('confirmed','completed')
        and starts_at >= v_month_start
    ),
    'prev_month_revenue_cents', (
      select coalesce(sum(price_cents),0) from public.appointments
      where business_id = p_business_id
        and status in ('confirmed','completed')
        and starts_at >= v_prev_month_start and starts_at < v_month_start
    ),
    'month_new_customers', (
      select count(*) from public.customers
      where business_id = p_business_id and created_at >= v_month_start
    ),
    'prev_month_new_customers', (
      select count(*) from public.customers
      where business_id = p_business_id
        and created_at >= v_prev_month_start and created_at < v_month_start
    )
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.business_dashboard_summary(uuid) from public;
grant execute on function public.business_dashboard_summary(uuid) to authenticated;

-- =========================================================
-- Analytics
-- =========================================================

create or replace function public.business_analytics(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_tz text;
  v_result jsonb;
begin
  if not public.is_business_member(p_business_id) and not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select timezone into v_tz from public.businesses where id = p_business_id;

  select jsonb_build_object(
    'totals', jsonb_build_object(
      'bookings', (select count(*) from public.appointments
                   where business_id = p_business_id
                     and starts_at >= p_from and starts_at < p_to),
      'revenue_cents', (select coalesce(sum(price_cents),0) from public.appointments
                        where business_id = p_business_id
                          and status in ('confirmed','completed')
                          and starts_at >= p_from and starts_at < p_to),
      'cancelled', (select count(*) from public.appointments
                    where business_id = p_business_id
                      and status = 'cancelled'
                      and starts_at >= p_from and starts_at < p_to),
      'no_show', (select count(*) from public.appointments
                  where business_id = p_business_id
                    and status = 'no_show'
                    and starts_at >= p_from and starts_at < p_to),
      'new_customers', (select count(*) from public.customers
                        where business_id = p_business_id
                          and created_at >= p_from and created_at < p_to)
    ),
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'bookings', d.bookings,
        'revenue_cents', d.revenue_cents
      ) order by d.day), '[]'::jsonb)
      from (
        select
          (date_trunc('day', a.starts_at at time zone v_tz))::date as day,
          count(*) as bookings,
          coalesce(sum(case when a.status in ('confirmed','completed') then a.price_cents else 0 end),0) as revenue_cents
        from public.appointments a
        where a.business_id = p_business_id
          and a.starts_at >= p_from and a.starts_at < p_to
        group by 1
      ) d
    ),
    'by_service', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'service_id', d.service_id,
        'service_name', d.service_name,
        'bookings', d.bookings,
        'revenue_cents', d.revenue_cents
      ) order by d.revenue_cents desc), '[]'::jsonb)
      from (
        select s.id as service_id, s.name as service_name,
               count(*) as bookings,
               coalesce(sum(case when a.status in ('confirmed','completed') then a.price_cents else 0 end),0) as revenue_cents
        from public.appointments a
        join public.services s on s.id = a.service_id
        where a.business_id = p_business_id
          and a.starts_at >= p_from and a.starts_at < p_to
        group by 1,2
      ) d
    ),
    'by_staff', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'staff_id', d.staff_id,
        'staff_name', d.staff_name,
        'bookings', d.bookings
      ) order by d.bookings desc), '[]'::jsonb)
      from (
        select st.id as staff_id, st.display_name as staff_name,
               count(*) as bookings
        from public.appointments a
        join public.staff st on st.id = a.staff_id
        where a.business_id = p_business_id
          and a.starts_at >= p_from and a.starts_at < p_to
        group by 1,2
      ) d
    ),
    'by_status', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'status', d.status, 'count', d.count
      )), '[]'::jsonb)
      from (
        select status, count(*) as count
        from public.appointments
        where business_id = p_business_id
          and starts_at >= p_from and starts_at < p_to
        group by status
      ) d
    )
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.business_analytics(uuid,timestamptz,timestamptz) from public;
grant execute on function public.business_analytics(uuid,timestamptz,timestamptz) to authenticated;

-- =========================================================
-- Business-side appointment creation
-- =========================================================

create or replace function public.create_business_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_customer_email citext default null,
  p_customer_phone text default null,
  p_staff_id uuid default null,
  p_location_id uuid default null,
  p_notes text default null,
  p_internal_notes text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_customer_id uuid := p_customer_id;
  v_duration interval;
  v_buffer_before interval;
  v_buffer_after interval;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_ends_at timestamptz;
  v_reference text;
  v_appointment public.appointments;
  v_attempt int := 0;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into v_business from public.businesses where id = p_business_id;

  perform 1 from public.businesses where id = p_business_id for update;

  select * into v_service from public.services
    where id = p_service_id and business_id = p_business_id and is_active = true;
  if v_service is null then
    raise exception 'service not available' using errcode = '22023';
  end if;

  v_duration := make_interval(mins => v_service.duration_minutes);
  v_buffer_before := make_interval(mins => v_service.buffer_before_minutes);
  v_buffer_after := make_interval(mins => v_service.buffer_after_minutes);
  v_ends_at := p_starts_at + v_duration;
  v_window_start := p_starts_at - v_buffer_before;
  v_window_end := v_ends_at + v_buffer_after;

  if v_customer_id is null then
    if p_customer_email is null or length(trim(p_customer_name)) < 1 then
      raise exception 'customer name and email required' using errcode = '22023';
    end if;
    select id into v_customer_id from public.customers
      where business_id = p_business_id and lower(email::text) = lower(p_customer_email::text);
    if v_customer_id is null then
      insert into public.customers (business_id, full_name, email, phone)
      values (p_business_id, p_customer_name, p_customer_email, nullif(p_customer_phone,''))
      returning id into v_customer_id;
    end if;
  end if;

  if p_staff_id is not null then
    if not exists (select 1 from public.staff where id = p_staff_id and business_id = p_business_id and is_active) then
      raise exception 'staff not available' using errcode = '22023';
    end if;
  end if;

  if p_location_id is not null then
    if not exists (select 1 from public.locations where id = p_location_id and business_id = p_business_id and is_active) then
      raise exception 'location not available' using errcode = '22023';
    end if;
  end if;

  if exists (
    select 1 from public.appointments a
    where a.business_id = p_business_id
      and a.status in ('pending','confirmed')
      and (
        (p_staff_id is not null and a.staff_id = p_staff_id)
        or (p_staff_id is null and a.staff_id is null)
      )
      and tstzrange(a.starts_at, a.ends_at, '[)')
          && tstzrange(v_window_start, v_window_end, '[)')
  ) then
    raise exception 'slot no longer available' using errcode = '22023';
  end if;

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 5 then
      raise exception 'could not allocate reference' using errcode = '22023';
    end if;
    v_reference := 'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.appointments where reference = v_reference);
  end loop;

  insert into public.appointments (
    business_id, location_id, service_id, staff_id, customer_id,
    reference, status, starts_at, ends_at, duration_minutes,
    price_cents, currency, created_via, created_by, notes, internal_notes
  ) values (
    p_business_id, p_location_id, v_service.id, p_staff_id, v_customer_id,
    v_reference, 'confirmed', p_starts_at, v_ends_at, v_service.duration_minutes,
    v_service.price_cents, coalesce(v_service.currency, v_business.currency),
    'business', auth.uid(), nullif(p_notes,''), nullif(p_internal_notes,'')
  )
  returning * into v_appointment;

  insert into public.appointment_events (appointment_id, event_type, actor_user_id, actor_kind, metadata)
  values (v_appointment.id, 'created', auth.uid(), 'business',
          jsonb_build_object('via','dashboard'));

  return v_appointment;
end;
$$;
revoke all on function public.create_business_appointment(uuid,uuid,timestamptz,uuid,text,citext,text,uuid,uuid,text,text) from public;
grant execute on function public.create_business_appointment(uuid,uuid,timestamptz,uuid,text,citext,text,uuid,uuid,text,text) to authenticated;

-- =========================================================
-- Business-side reschedule
-- =========================================================

create or replace function public.reschedule_business_appointment(
  p_appointment_id uuid,
  p_new_starts_at timestamptz,
  p_new_staff_id uuid default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_business public.businesses;
  v_service public.services;
  v_duration interval;
  v_buffer_before interval;
  v_buffer_after interval;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_ends_at timestamptz;
  v_staff_id uuid;
  v_old_starts_at timestamptz;
begin
  select * into v_appointment from public.appointments where id = p_appointment_id;
  if v_appointment is null then
    raise exception 'not found' using errcode = '22023';
  end if;
  if not public.is_business_member(v_appointment.business_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_old_starts_at := v_appointment.starts_at;

  select * into v_business from public.businesses where id = v_appointment.business_id;
  perform 1 from public.businesses where id = v_appointment.business_id for update;

  select * into v_service from public.services where id = v_appointment.service_id;
  v_duration := make_interval(mins => v_service.duration_minutes);
  v_buffer_before := make_interval(mins => v_service.buffer_before_minutes);
  v_buffer_after := make_interval(mins => v_service.buffer_after_minutes);
  v_ends_at := p_new_starts_at + v_duration;
  v_window_start := p_new_starts_at - v_buffer_before;
  v_window_end := v_ends_at + v_buffer_after;

  v_staff_id := coalesce(p_new_staff_id, v_appointment.staff_id);

  if exists (
    select 1 from public.appointments a
    where a.business_id = v_appointment.business_id
      and a.id <> v_appointment.id
      and a.status in ('pending','confirmed')
      and (
        (v_staff_id is not null and a.staff_id = v_staff_id)
        or (v_staff_id is null and a.staff_id is null)
      )
      and tstzrange(a.starts_at, a.ends_at, '[)')
          && tstzrange(v_window_start, v_window_end, '[)')
  ) then
    raise exception 'slot no longer available' using errcode = '22023';
  end if;

  update public.appointments
  set starts_at = p_new_starts_at,
      ends_at = v_ends_at,
      staff_id = v_staff_id,
      updated_at = now()
  where id = v_appointment.id
  returning * into v_appointment;

  insert into public.appointment_events (appointment_id, event_type, actor_user_id, actor_kind, metadata)
  values (v_appointment.id, 'rescheduled', auth.uid(), 'business',
          jsonb_build_object('old_starts_at', v_old_starts_at, 'new_starts_at', p_new_starts_at));

  return v_appointment;
end;
$$;
revoke all on function public.reschedule_business_appointment(uuid,timestamptz,uuid) from public;
grant execute on function public.reschedule_business_appointment(uuid,timestamptz,uuid) to authenticated;