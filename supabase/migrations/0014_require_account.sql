-- 0014_require_account.sql
-- Optional account gate for public booking. When
-- businesses.require_account_to_book is true, the public booking page
-- forces sign-up / sign-in before a slot can be booked, and the booking
-- RPC rejects anonymous or non-customer callers.

-- =========================================================
-- Column
-- =========================================================

alter table public.businesses
  add column if not exists require_account_to_book boolean not null default false;

-- =========================================================
-- has_customer_booked_at(business_id)
-- True when the current authenticated user is linked (via customers.user_id)
-- to at least one non-cancelled appointment at the business.
-- =========================================================

create or replace function public.has_customer_booked_at(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.appointments a
    join public.customers c on c.id = a.customer_id
    where a.business_id = p_business_id
      and c.user_id = auth.uid()
      and a.status in ('pending','confirmed','completed','no_show')
  );
$$;

revoke all on function public.has_customer_booked_at(uuid) from public;
grant execute on function public.has_customer_booked_at(uuid) to authenticated;

-- =========================================================
-- create_public_booking: enforce require_account_to_book
-- =========================================================
-- We keep the existing signature and behavior. The only new rule: when
-- the business requires an account, the caller must be an authenticated
-- user already linked to a customers row for this business (or must be
-- able to be linked by email match — we link on insert).

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
  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'name required' using errcode = '22023';
  end if;
  if p_email is null or position('@' in p_email) < 2 then
    raise exception 'valid email required' using errcode = '22023';
  end if;
  if p_starts_at is null then
    raise exception 'start time required' using errcode = '22023';
  end if;

  if not public.check_rate_limit(
    'book:' || coalesce(p_email::text, '') || ':' || coalesce(p_slug::text, ''),
    10, 900
  ) then
    raise exception 'too many booking attempts, please try again later'
      using errcode = '22023';
  end if;

  select * into v_business from public.businesses
    where slug = p_slug and status = 'active';
  if v_business is null then
    raise exception 'business not available' using errcode = '22023';
  end if;

  -- === NEW: enforce account gate when required ===
  if v_business.require_account_to_book then
    if v_caller is null then
      raise exception 'sign in required to book with this business'
        using errcode = '22023';
    end if;
    -- The caller must be linked to a customers row for this business
    -- (or have an email match that will allow linking on insert).
    if not exists (
      select 1 from public.customers
      where business_id = v_business.id
        and user_id = v_caller
    ) and not exists (
      select 1 from public.customers
      where business_id = v_business.id
        and lower(email::text) = lower(p_email::text)
    ) then
      raise exception 'no customer record for this account at this business'
        using errcode = '22023';
    end if;
  end if;

  -- Business-level lock
  perform 1 from public.businesses where id = v_business.id for update;

  select * into v_business from public.businesses
    where id = v_business.id and status = 'active';
  if v_business is null then
    raise exception 'business not available' using errcode = '22023';
  end if;

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

  if p_location_id is not null then
    if not exists (
      select 1 from public.locations
      where id = p_location_id and business_id = v_business.id and is_active
    ) then
      raise exception 'location not available' using errcode = '22023';
    end if;
  end if;

  if p_starts_at < now() + make_interval(mins => v_business.min_notice_minutes) then
    raise exception 'booking too soon' using errcode = '22023';
  end if;
  if p_starts_at > now() + make_interval(days => v_business.max_advance_days) then
    raise exception 'booking too far in advance' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.business_id = v_business.id
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

  if exists (
    select 1 from public.business_closures bc
    where bc.business_id = v_business.id
      and (bc.location_id is null or bc.location_id = p_location_id)
      and tstzrange(bc.starts_at, bc.ends_at, '[)')
          && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'business closed at that time' using errcode = '22023';
  end if;

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

  v_status := case when v_business.auto_confirm_bookings
                   then 'confirmed' else 'pending' end;

  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 5 then
      raise exception 'could not allocate booking reference' using errcode = '22023';
    end if;
    v_reference := 'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.appointments where reference = v_reference);
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

  insert into public.appointment_events (appointment_id, event_type, actor_user_id, actor_kind, metadata)
  values (v_appointment.id, 'created', v_caller, 'customer',
          jsonb_build_object('via','public','email', p_email,
                             'auto_confirmed', v_business.auto_confirm_bookings));

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
-- update_business_settings: allow require_account_to_book
-- =========================================================

create or replace function public.update_business_settings(
  p_business_id uuid,
  p_patch jsonb
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
begin
  if not public.is_business_owner(p_business_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.businesses b set
    name                    = coalesce(nullif(p_patch->>'name', ''), b.name),
    description             = coalesce(p_patch->>'description', b.description),
    logo_url                = coalesce(p_patch->>'logo_url', b.logo_url),
    contact_email           = coalesce(nullif(p_patch->>'contact_email', '')::citext, b.contact_email),
    contact_phone           = coalesce(p_patch->>'contact_phone', b.contact_phone),
    timezone                = coalesce(nullif(p_patch->>'timezone', ''), b.timezone),
    currency                = coalesce(nullif(p_patch->>'currency', ''), b.currency),
    locale                  = coalesce(nullif(p_patch->>'locale', ''), b.locale),
    guest_booking_enabled   = coalesce((p_patch->>'guest_booking_enabled')::boolean, b.guest_booking_enabled),
    auto_confirm_bookings   = coalesce((p_patch->>'auto_confirm_bookings')::boolean, b.auto_confirm_bookings),
    min_notice_minutes      = coalesce((p_patch->>'min_notice_minutes')::int, b.min_notice_minutes),
    max_advance_days        = coalesce((p_patch->>'max_advance_days')::int, b.max_advance_days),
    reschedule_cutoff_hours = coalesce((p_patch->>'reschedule_cutoff_hours')::int, b.reschedule_cutoff_hours),
    cancel_cutoff_hours     = coalesce((p_patch->>'cancel_cutoff_hours')::int, b.cancel_cutoff_hours),
    require_account_to_book = coalesce((p_patch->>'require_account_to_book')::boolean, b.require_account_to_book)
  where b.id = p_business_id
  returning * into v_business;

  insert into public.audit_logs (actor_user_id, actor_role, business_id, action, target_table, target_id, metadata)
  values (auth.uid(), 'business_owner', p_business_id, 'business.update_settings',
          'businesses', p_business_id::text, p_patch);

  return v_business;
end;
$$;

revoke all on function public.update_business_settings(uuid, jsonb) from public;
grant execute on function public.update_business_settings(uuid, jsonb) to authenticated;