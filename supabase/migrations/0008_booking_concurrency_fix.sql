-- 0008_booking_concurrency_fix.sql
-- Fixes double-booking when staff_id is NULL and closes the race between
-- the conflict check and the INSERT.
--
-- Strategy:
--   1. Take a business-level row lock at the very start of the RPC. This
--      serializes all bookings for a given business, so the conflict check
--      and the insert are atomic with respect to each other.
--   2. When staff_id is NULL, also check conflicts among other NULL-staff
--      appointments for the same business, using the same buffer window
--      the availability RPC exposes to customers.
--   3. Keep all other validations intact.

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
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_ends_at timestamptz;
  v_price_cents int;
  v_currency text;
  v_status text;
  v_reference text;
  v_appointment public.appointments;
  v_caller uuid := auth.uid();
  v_customer_user_id uuid;
  v_attempt int := 0;
begin
  -- Input sanity
  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'name required' using errcode = '22023';
  end if;
  if p_email is null or position('@' in p_email) < 2 then
    raise exception 'valid email required' using errcode = '22023';
  end if;
  if p_starts_at is null then
    raise exception 'start time required' using errcode = '22023';
  end if;

  -- Rate limit
  if not public.check_rate_limit(
    'book:' || coalesce(p_email::text, '') || ':' || coalesce(p_slug::text, ''),
    10, 900
  ) then
    raise exception 'too many booking attempts, please try again later'
      using errcode = '22023';
  end if;

  -- Look up business WITHOUT locking (fast path, safe to do before lock)
  select * into v_business from public.businesses
    where slug = p_slug and status = 'active';
  if v_business is null then
    raise exception 'business not available' using errcode = '22023';
  end if;

  -- === Business-level lock: serializes concurrent bookings for this business.
  -- This must be taken BEFORE the conflict check.
  perform 1 from public.businesses where id = v_business.id for update;

  -- Re-read inside the lock in case it changed
  select * into v_business from public.businesses
    where id = v_business.id and status = 'active';
  if v_business is null then
    raise exception 'business not available' using errcode = '22023';
  end if;

  -- Service validation
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

  v_ends_at := p_starts_at + v_duration;
  v_window_start := p_starts_at - v_buffer_before;
  v_window_end := v_ends_at + v_buffer_after;

  -- Staff validation
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
  end if;

  -- Location validation
  if p_location_id is not null then
    if not exists (
      select 1 from public.locations
      where id = p_location_id and business_id = v_business.id and is_active
    ) then
      raise exception 'location not available' using errcode = '22023';
    end if;
  end if;

  -- Timing window validation
  if p_starts_at < now() + make_interval(mins => v_business.min_notice_minutes) then
    raise exception 'booking too soon' using errcode = '22023';
  end if;
  if p_starts_at > now() + make_interval(days => v_business.max_advance_days) then
    raise exception 'booking too far in advance' using errcode = '22023';
  end if;

  -- === Conflict check: identical logic whether or not staff is chosen ===
  -- Same staff (if provided) OR same-business null-staff overlap (if not).
  if exists (
    select 1 from public.appointments a
    where a.business_id = v_business.id
      and a.status in ('pending','confirmed')
      and (
        -- Same explicit staff member
        (p_staff_id is not null and a.staff_id = p_staff_id)
        -- OR both are "any staff" for this business
        or (p_staff_id is null and a.staff_id is null)
      )
      and tstzrange(a.starts_at, a.ends_at, '[)')
          && tstzrange(v_window_start, v_window_end, '[)')
  ) then
    raise exception 'slot no longer available' using errcode = '22023';
  end if;

  -- Staff time off
  if p_staff_id is not null then
    if exists (
      select 1 from public.staff_time_off sto
      where sto.staff_id = p_staff_id
        and tstzrange(sto.starts_at, sto.ends_at, '[)')
            && tstzrange(p_starts_at, v_ends_at, '[)')
    ) then
      raise exception 'staff unavailable' using errcode = '22023';
    end if;
  end if;

  -- Business closure
  if exists (
    select 1 from public.business_closures bc
    where bc.business_id = v_business.id
      and (bc.location_id is null or bc.location_id = p_location_id)
      and tstzrange(bc.starts_at, bc.ends_at, '[)')
          && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'business closed at that time' using errcode = '22023';
  end if;

  -- Customer upsert
  if v_caller is not null then
    v_customer_user_id := v_caller;
  end if;

  select id into v_customer_id
  from public.customers
  where business_id = v_business.id
    and email is not null
    and lower(email) = lower(p_email::text);

  if v_customer_id is null then
    insert into public.customers (business_id, user_id, full_name, email, phone)
    values (v_business.id, v_customer_user_id, trim(p_full_name), p_email, nullif(p_phone, ''))
    returning id into v_customer_id;
  else
    update public.customers
    set full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
        phone = coalesce(nullif(p_phone, ''), phone),
        user_id = coalesce(user_id, v_customer_user_id),
        updated_at = now()
    where id = v_customer_id;
  end if;

  -- Status
  v_status := case when v_business.auto_confirm_bookings
                   then 'confirmed' else 'pending' end;

  -- Reference
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 5 then
      raise exception 'could not allocate booking reference' using errcode = '22023';
    end if;
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
    jsonb_build_object('via','public','email', p_email,
                       'auto_confirmed', v_business.auto_confirm_bookings)
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