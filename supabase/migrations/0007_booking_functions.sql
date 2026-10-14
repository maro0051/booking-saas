-- 0007_booking_functions.sql
-- Public booking RPCs.
--
-- All public booking goes through these functions. They run as the
-- function owner (security definer) and bypass RLS, but they perform
-- their own authorization/validation before touching data. The client
-- never supplies price, duration, status, or customer id.

-- =========================================================
-- Rate limiting (simple, DB-backed)
-- =========================================================

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create or replace function public.check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rate_limits;
begin
  select * into v_row from public.rate_limits where key = p_key for update;

  if v_row is null then
    insert into public.rate_limits (key, count, window_start)
    values (p_key, 1, now());
    return true;
  end if;

  if now() - v_row.window_start > make_interval(secs => p_window_seconds) then
    update public.rate_limits
    set count = 1, window_start = now()
    where key = p_key;
    return true;
  end if;

  if v_row.count >= p_max then
    return false;
  end if;

  update public.rate_limits
  set count = v_row.count + 1
  where key = p_key;
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, int, int) from public;
grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;

-- =========================================================
-- Auto-confirm flag on businesses
-- =========================================================

alter table public.businesses
  add column if not exists auto_confirm_bookings boolean not null default true;

-- =========================================================
-- Public business profile (safe fields only)
-- =========================================================

create or replace function public.get_public_business(p_slug citext)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', b.id,
    'slug', b.slug,
    'name', b.name,
    'description', b.description,
    'logo_url', b.logo_url,
    'timezone', b.timezone,
    'currency', b.currency,
    'locale', b.locale,
    'guest_booking_enabled', b.guest_booking_enabled,
    'auto_confirm_bookings', b.auto_confirm_bookings,
    'min_notice_minutes', b.min_notice_minutes,
    'max_advance_days', b.max_advance_days,
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'name', l.name, 'address', l.address, 'phone', l.phone
      ) order by l.name)
      from public.locations l
      where l.business_id = b.id and l.is_active
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'duration_minutes', s.duration_minutes,
        'price_cents', s.price_cents, 'currency', s.currency,
        'deposit_cents', s.deposit_cents
      ) order by s.name)
      from public.services s
      where s.business_id = b.id
        and s.is_active and s.online_booking_enabled
    ), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', st.id, 'display_name', st.display_name,
        'title', st.title, 'color', st.color,
        'service_ids', (
          select coalesce(jsonb_agg(ss.service_id), '[]'::jsonb)
          from public.staff_services ss where ss.staff_id = st.id
        ),
        'location_ids', (
          select coalesce(jsonb_agg(sl.location_id), '[]'::jsonb)
          from public.staff_locations sl where sl.location_id in (
            select id from public.locations where business_id = st.business_id
          ) and sl.staff_id = st.id
        )
      ) order by st.display_name)
      from public.staff st
      where st.business_id = b.id and st.is_active
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = p_slug and b.status = 'active';
$$;

revoke all on function public.get_public_business(citext) from public;
grant execute on function public.get_public_business(citext) to anon, authenticated;

-- =========================================================
-- Availability
-- =========================================================

create or replace function public.get_availability(
  p_slug citext,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid default null,
  p_location_id uuid default null
)
returns table (starts_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_tz text;
  v_min_notice interval;
  v_max_advance interval;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_step interval := interval '15 minutes';
  v_slot_duration interval;
  v_bh_open time;
  v_bh_close time;
  v_weekday int;
begin
  select * into v_business from public.businesses
    where slug = p_slug and status = 'active';
  if v_business is null then
    raise exception 'business not available' using errcode = '22023';
  end if;

  v_tz := v_business.timezone;
  v_min_notice := make_interval(mins => v_business.min_notice_minutes);
  v_max_advance := make_interval(days => v_business.max_advance_days);

  select * into v_service from public.services
    where id = p_service_id
      and business_id = v_business.id
      and is_active = true
      and online_booking_enabled = true;
  if v_service is null then
    raise exception 'service not available' using errcode = '22023';
  end if;

  -- Optional staff validation
  if p_staff_id is not null then
    if not exists (
      select 1 from public.staff s
      join public.staff_services ss on ss.staff_id = s.id
      where s.id = p_staff_id
        and s.business_id = v_business.id
        and s.is_active = true
        and ss.service_id = v_service.id
    ) then
      raise exception 'staff cannot perform this service' using errcode = '22023';
    end if;
  end if;

  -- Optional location validation
  if p_location_id is not null then
    if not exists (
      select 1 from public.locations
      where id = p_location_id and business_id = v_business.id and is_active
    ) then
      raise exception 'location not available' using errcode = '22023';
    end if;
  end if;

  v_weekday := extract(dow from p_date)::int;

  -- Business opening hours for that weekday
  select open_time, close_time into v_bh_open, v_bh_close
  from public.business_hours
  where business_id = v_business.id
    and weekday = v_weekday
    and (location_id is null or location_id = p_location_id)
  order by location_id nulls last
  limit 1;

  if v_bh_open is null then
    return; -- closed that day
  end if;

  v_day_start := (p_date::text || ' ' || v_bh_open::text)::timestamp
                 at time zone v_tz;
  v_day_end := (p_date::text || ' ' || v_bh_close::text)::timestamp
               at time zone v_tz;

  -- Service duration includes buffers
  v_slot_duration := make_interval(
    mins => v_service.duration_minutes
          + v_service.buffer_before_minutes
          + v_service.buffer_after_minutes
  );

  return query
  with slots as (
    select generate_series(
      v_day_start, v_day_end - v_slot_duration, v_step
    ) as slot_start
  )
  select s.slot_start
  from slots s
  where
    -- min notice / max advance
    s.slot_start >= now() + v_min_notice
    and s.slot_start <= now() + v_max_advance
    -- not during a business closure
    and not exists (
      select 1 from public.business_closures bc
      where bc.business_id = v_business.id
        and (bc.location_id is null or bc.location_id = p_location_id)
        and tstzrange(bc.starts_at, bc.ends_at, '[)')
            && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
    )
    -- no conflict with existing confirmed/pending appointments for same staff
    and (
      p_staff_id is null
      or not exists (
        select 1 from public.appointments a
        where a.staff_id = p_staff_id
          and a.status in ('pending','confirmed')
          and tstzrange(a.starts_at, a.ends_at, '[)')
              && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
      )
    )
    -- staff time off
    and (
      p_staff_id is null
      or not exists (
        select 1 from public.staff_time_off sto
        where sto.staff_id = p_staff_id
          and tstzrange(sto.starts_at, sto.ends_at, '[)')
              && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
      )
    )
    -- staff weekly hours (if defined for that weekday, respect them)
    and (
      p_staff_id is null
      or not exists (
        select 1 from public.staff_hours sh
        where sh.staff_id = p_staff_id
          and sh.weekday = v_weekday
      )
      or exists (
        select 1 from public.staff_hours sh
        where sh.staff_id = p_staff_id
          and sh.weekday = v_weekday
          and (s.slot_start at time zone v_tz)::time >= sh.start_time
          and ((s.slot_start + v_slot_duration) at time zone v_tz)::time <= sh.end_time
      )
    )
  order by s.slot_start;
end;
$$;

revoke all on function public.get_availability(citext, uuid, date, uuid, uuid) from public;
grant execute on function public.get_availability(citext, uuid, date, uuid, uuid) to anon, authenticated;

-- =========================================================
-- Booking creation (the security-critical one)
-- =========================================================

create or replace function public.create_public_booking(
  p_slug citext,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_full_name text,
  p_email citext,
  p_phone text default null,
  p_staff_id uuid default null,
  p_location_id uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_staff public.staff;
  v_customer_id uuid;
  v_duration interval;
  v_buffer_before interval;
  v_buffer_after interval;
  v_ends_at timestamptz;
  v_price_cents int;
  v_currency text;
  v_status text;
  v_reference text;
  v_appointment public.appointments;
  v_caller uuid := auth.uid();
  v_customer_user_id uuid;
begin
  -- input sanity
  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'name required' using errcode = '22023';
  end if;
  if p_email is null or position('@' in p_email) < 2 then
    raise exception 'valid email required' using errcode = '22023';
  end if;
  if p_starts_at is null then
    raise exception 'start time required' using errcode = '22023';
  end if;

  -- rate limit: 10 booking attempts per email per 15 minutes
  if not public.check_rate_limit(
    'book:' || coalesce(p_email::text, '') || ':' || coalesce(p_slug::text, ''),
    10, 900
  ) then
    raise exception 'too many booking attempts, please try again later'
      using errcode = '22023';
  end if;

  -- Business must be active
  select * into v_business from public.businesses
    where slug = p_slug and status = 'active';
  if v_business is null then
    raise exception 'business not available' using errcode = '22023';
  end if;

  -- Service must belong to business and be bookable
  select * into v_service from public.services
    where id = p_service_id
      and business_id = v_business.id
      and is_active = true
      and online_booking_enabled = true;
  if v_service is null then
    raise exception 'service not available' using errcode = '22023';
  end if;

  v_duration := make_interval(mins => v_service.duration_minutes);
  v_buffer_before := make_interval(mins => v_service.buffer_before_minutes);
  v_buffer_after := make_interval(mins => v_service.buffer_after_minutes);
  v_price_cents := v_service.price_cents;
  v_currency := coalesce(v_service.currency, v_business.currency);

  -- Staff optional validation
  if p_staff_id is not null then
    select * into v_staff from public.staff
      where id = p_staff_id
        and business_id = v_business.id
        and is_active = true;
    if v_staff is null then
      raise exception 'staff not available' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.staff_services
      where staff_id = p_staff_id and service_id = v_service.id
    ) then
      raise exception 'staff cannot perform this service' using errcode = '22023';
    end if;

    -- Lock the staff row to serialize concurrent bookings for the same staff
    perform 1 from public.staff where id = p_staff_id for update;
  end if;

  -- Location optional validation
  if p_location_id is not null then
    if not exists (
      select 1 from public.locations
      where id = p_location_id and business_id = v_business.id and is_active
    ) then
      raise exception 'location not available' using errcode = '22023';
    end if;
  end if;

  -- Re-validate min notice / max advance
  if p_starts_at < now() + make_interval(mins => v_business.min_notice_minutes) then
    raise exception 'booking too soon' using errcode = '22023';
  end if;
  if p_starts_at > now() + make_interval(days => v_business.max_advance_days) then
    raise exception 'booking too far in advance' using errcode = '22023';
  end if;

  v_ends_at := p_starts_at + v_duration;

  -- Re-verify this exact slot is free for the requested staff
  if p_staff_id is not null then
    if exists (
      select 1 from public.appointments a
      where a.staff_id = p_staff_id
        and a.status in ('pending','confirmed')
        and tstzrange(a.starts_at, a.ends_at, '[)')
            && tstzrange(
                 p_starts_at - v_buffer_before,
                 v_ends_at + v_buffer_after,
                 '[)'
               )
    ) then
      raise exception 'slot no longer available' using errcode = '22023';
    end if;

    if exists (
      select 1 from public.staff_time_off sto
      where sto.staff_id = p_staff_id
        and tstzrange(sto.starts_at, sto.ends_at, '[)')
            && tstzrange(p_starts_at, v_ends_at, '[)')
    ) then
      raise exception 'staff unavailable' using errcode = '22023';
    end if;
  end if;

  -- Business closure check
  if exists (
    select 1 from public.business_closures bc
    where bc.business_id = v_business.id
      and (bc.location_id is null or bc.location_id = p_location_id)
      and tstzrange(bc.starts_at, bc.ends_at, '[)')
          && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'business closed at that time' using errcode = '22023';
  end if;

  -- Upsert customer (per business, by lower(email))
  if v_caller is not null then
    v_customer_user_id := v_caller;
  end if;

  select id into v_customer_id
  from public.customers
  where business_id = v_business.id
    and email is not null
    and lower(email) = lower(p_email::text);

  if v_customer_id is null then
    insert into public.customers (
      business_id, user_id, full_name, email, phone
    ) values (
      v_business.id, v_customer_user_id,
      trim(p_full_name), p_email, nullif(p_phone, '')
    )
    returning id into v_customer_id;
  else
    update public.customers
    set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
        phone = coalesce(nullif(p_phone, ''), phone),
        user_id = coalesce(user_id, v_customer_user_id),
        updated_at = now()
    where id = v_customer_id;
  end if;

  -- Booking status
  v_status := case when v_business.auto_confirm_bookings
                   then 'confirmed' else 'pending' end;

  -- Unique booking reference
  loop
    v_reference := 'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.appointments where reference = v_reference
    );
  end loop;

  insert into public.appointments (
    business_id, location_id, service_id, staff_id, customer_id,
    reference, status, starts_at, ends_at, duration_minutes,
    price_cents, currency, created_via, notes
  ) values (
    v_business.id, p_location_id, v_service.id, p_staff_id, v_customer_id,
    v_reference, v_status, p_starts_at, v_ends_at, v_service.duration_minutes,
    v_price_cents, v_currency, 'public', nullif(p_notes, '')
  )
  returning * into v_appointment;

  insert into public.appointment_events (
    appointment_id, event_type, actor_user_id, actor_kind, metadata
  ) values (
    v_appointment.id, 'created', v_caller, 'customer',
    jsonb_build_object(
      'via', 'public',
      'email', p_email,
      'auto_confirmed', v_business.auto_confirm_bookings
    )
  );

  return jsonb_build_object(
    'id', v_appointment.id,
    'reference', v_appointment.reference,
    'status', v_appointment.status,
    'starts_at', v_appointment.starts_at,
    'ends_at', v_appointment.ends_at,
    'price_cents', v_appointment.price_cents,
    'currency', v_appointment.currency
  );
end;
$$;

revoke all on function public.create_public_booking(
  citext, uuid, timestamptz, text, citext, text, uuid, uuid, text
) from public;
grant execute on function public.create_public_booking(
  citext, uuid, timestamptz, text, citext, text, uuid, uuid, text
) to anon, authenticated;

-- =========================================================
-- Safe read of an appointment by reference
-- =========================================================

create or replace function public.get_booking_by_reference(
  p_slug citext,
  p_reference text
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'reference', a.reference,
    'status', a.status,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'price_cents', a.price_cents,
    'currency', a.currency,
    'notes', a.notes,
    'business', jsonb_build_object(
      'slug', b.slug, 'name', b.name,
      'timezone', b.timezone,
      'contact_email', b.contact_email, 'contact_phone', b.contact_phone
    ),
    'service', jsonb_build_object(
      'id', s.id, 'name', s.name,
      'duration_minutes', s.duration_minutes
    ),
    'staff', case when st.id is null then null else
      jsonb_build_object('id', st.id, 'display_name', st.display_name)
    end,
    'location', case when l.id is null then null else
      jsonb_build_object('id', l.id, 'name', l.name, 'address', l.address)
    end,
    'customer', jsonb_build_object(
      'full_name', c.full_name,
      'email_masked', case
        when c.email is null then null
        else substr(c.email::text, 1, 2) || '***@' ||
             split_part(c.email::text, '@', 2)
      end
    )
  )
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  join public.services s on s.id = a.service_id
  join public.customers c on c.id = a.customer_id
  left join public.staff st on st.id = a.staff_id
  left join public.locations l on l.id = a.location_id
  where b.slug = p_slug and a.reference = p_reference;
$$;

revoke all on function public.get_booking_by_reference(citext, text) from public;
grant execute on function public.get_booking_by_reference(citext, text) to anon, authenticated;

-- =========================================================
-- Cancel by reference (requires the customer's email)
-- =========================================================

create or replace function public.cancel_booking_by_reference(
  p_slug citext,
  p_reference text,
  p_email citext
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt public.appointments;
  v_business public.businesses;
  v_customer public.customers;
begin
  if p_email is null then
    raise exception 'email required' using errcode = '22023';
  end if;

  select * into v_business from public.businesses
    where slug = p_slug and status in ('active','suspended');
  if v_business is null then
    raise exception 'business not found' using errcode = '22023';
  end if;

  select * into v_appt from public.appointments
    where business_id = v_business.id and reference = p_reference;
  if v_appt is null then
    raise exception 'booking not found' using errcode = '22023';
  end if;

  select * into v_customer from public.customers where id = v_appt.customer_id;
  if v_customer is null
     or v_customer.email is null
     or lower(v_customer.email::text) <> lower(p_email::text) then
    raise exception 'email does not match booking' using errcode = '22023';
  end if;

  if v_appt.status in ('cancelled','completed','no_show') then
    raise exception 'booking cannot be cancelled' using errcode = '22023';
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_reason = 'customer cancelled',
      updated_at = now()
  where id = v_appt.id;

  insert into public.appointment_events (
    appointment_id, event_type, actor_kind, metadata
  ) values (
    v_appt.id, 'cancelled', 'customer',
    jsonb_build_object('email', p_email, 'via', 'reference-link')
  );

  return jsonb_build_object('reference', v_appt.reference, 'status', 'cancelled');
end;
$$;

revoke all on function public.cancel_booking_by_reference(citext, text, citext) from public;
grant execute on function public.cancel_booking_by_reference(citext, text, citext) to anon, authenticated;