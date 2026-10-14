-- 0029_plan_limits.sql
-- Server-side enforcement of plan limits.

-- =========================================================
-- 1. Helper: resolve plan + usage for a business
-- =========================================================

create or replace function public.business_plan_limits(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_plan public.subscription_plans;
  v_staff int;
  v_services int;
  v_locations int;
  v_appts_month int;
begin
  select sp.* into v_plan
  from public.subscription_plans sp
  join public.businesses b on b.current_plan_id = sp.id
  where b.id = p_business_id;

  select count(*) into v_staff from public.staff
    where business_id = p_business_id and is_active = true;
  select count(*) into v_services from public.services
    where business_id = p_business_id and is_active = true;
  select count(*) into v_locations from public.locations
    where business_id = p_business_id and is_active = true;
  select count(*) into v_appts_month from public.appointments
    where business_id = p_business_id
      and starts_at >= date_trunc('month', now());

  return jsonb_build_object(
    'plan_id', v_plan.id,
    'plan_name', v_plan.name,
    'plan_code', v_plan.code,
    'max_staff', v_plan.max_staff,
    'max_services', v_plan.max_services,
    'max_locations', v_plan.max_locations,
    'max_appointments_per_month', v_plan.max_appointments_per_month,
    'emails_enabled', coalesce((v_plan.features->>'emails')::boolean, false),
    'usage', jsonb_build_object(
      'staff', v_staff,
      'services', v_services,
      'locations', v_locations,
      'appointments_this_month', v_appts_month
    ),
    'can_add', jsonb_build_object(
      'staff', v_plan.max_staff is null or v_plan.max_staff = 0 or v_staff < v_plan.max_staff,
      'services', v_plan.max_services is null or v_plan.max_services = 0 or v_services < v_plan.max_services,
      'locations', v_plan.max_locations is null or v_plan.max_locations = 0 or v_locations < v_plan.max_locations,
      'appointments', v_plan.max_appointments_per_month is null or v_plan.max_appointments_per_month = 0 or v_appts_month < v_plan.max_appointments_per_month
    )
  );
end;
$$;

revoke all on function public.business_plan_limits(uuid) from public;
grant execute on function public.business_plan_limits(uuid) to authenticated;

-- =========================================================
-- 2. Trigger: enforce staff / services / locations
-- =========================================================

create or replace function public.tg_enforce_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limits jsonb;
  v_resource text;
  v_can_add boolean;
  v_max int;
  v_usage int;
begin
  if tg_table_name = 'staff' then v_resource := 'staff';
  elsif tg_table_name = 'services' then v_resource := 'services';
  elsif tg_table_name = 'locations' then v_resource := 'locations';
  else return new;
  end if;

  -- Only count active rows toward the limit
  if (tg_op = 'INSERT' and new.is_active = false)
     or (tg_op = 'UPDATE' and new.is_active = false) then
    return new;
  end if;

  v_limits := public.business_plan_limits(new.business_id);
  v_can_add := coalesce((v_limits->'can_add'->>v_resource)::boolean, true);

  if not v_can_add then
    v_max := coalesce((v_limits->>('max_' || v_resource))::int, 0);
    v_usage := coalesce((v_limits->'usage'->>v_resource)::int, 0);
    raise exception 'plan limit reached for % (% of %)', v_resource, v_usage, v_max
      using errcode = '23514',
            hint = 'Upgrade your plan to add more.';
  end if;

  return new;
end;
$$;

drop trigger if exists staff_enforce_plan_limit on public.staff;
create trigger staff_enforce_plan_limit
  before insert or update on public.staff
  for each row execute function public.tg_enforce_plan_limits();

drop trigger if exists services_enforce_plan_limit on public.services;
create trigger services_enforce_plan_limit
  before insert or update on public.services
  for each row execute function public.tg_enforce_plan_limits();

drop trigger if exists locations_enforce_plan_limit on public.locations;
create trigger locations_enforce_plan_limit
  before insert or update on public.locations
  for each row execute function public.tg_enforce_plan_limits();

-- =========================================================
-- 3. Appointment quota: patch the two booking RPCs
-- =========================================================

-- 3a. create_business_appointment — add quota check at the top
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
  v_limits jsonb;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- === Plan quota check ===
  v_limits := public.business_plan_limits(p_business_id);
  if not coalesce((v_limits->'can_add'->>'appointments')::boolean, true) then
    raise exception 'monthly appointment limit reached for your plan'
      using errcode = '23514', hint = 'Upgrade your plan to add more bookings.';
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

-- 3b. Patch create_public_booking — add quota check

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
  v_limits jsonb;
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

  -- === Plan quota check ===
  v_limits := public.business_plan_limits(v_business.id);
  if not coalesce((v_limits->'can_add'->>'appointments')::boolean, true) then
    raise exception 'this business has reached its monthly booking limit'
      using errcode = '23514';
  end if;

  if v_business.require_account_to_book then
    if v_caller is null then
      raise exception 'sign in required to book with this business'
        using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.customers
      where business_id = v_business.id and user_id = v_caller
    ) and not exists (
      select 1 from public.customers
      where business_id = v_business.id
        and lower(email::text) = lower(p_email::text)
    ) then
      raise exception 'no customer record for this account at this business'
        using errcode = '22023';
    end if;
  end if;

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
      where id = p_staff_id and business_id = v_business.id and is_active = true;
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
-- 4. Gate email notifications on plan flag
-- =========================================================

create or replace function public.tg_appointment_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
  v_business public.businesses;
  v_service public.services;
  v_emails_enabled boolean;
begin
  -- Look up whether this plan includes email notifications
  select * into v_business from public.businesses where id = new.business_id;
  select coalesce((sp.features->>'emails')::boolean, false) into v_emails_enabled
  from public.subscription_plans sp
  where sp.id = v_business.current_plan_id;
  v_emails_enabled := coalesce(v_emails_enabled, false);

  -- Free plans and plans without the flag don't queue emails
  if not v_emails_enabled then
    return new;
  end if;

  select * into v_customer from public.customers where id = new.customer_id;
  select * into v_service from public.services where id = new.service_id;

  if tg_op = 'INSERT' then
    perform public.queue_notification(
      new.business_id, new.id, v_customer.email,
      case when new.status = 'confirmed' then 'booking_confirmed'
           else 'booking_pending' end,
      jsonb_build_object(
        'reference', new.reference,
        'starts_at', new.starts_at,
        'ends_at', new.ends_at,
        'service_name', v_service.name,
        'business_name', v_business.name,
        'business_slug', v_business.slug,
        'customer_name', v_customer.full_name
      )
    );
  elsif tg_op = 'UPDATE' then
    if new.status <> old.status then
      perform public.queue_notification(
        new.business_id, new.id, v_customer.email,
        'booking_' || new.status,
        jsonb_build_object(
          'reference', new.reference,
          'starts_at', new.starts_at,
          'ends_at', new.ends_at,
          'service_name', v_service.name,
          'business_name', v_business.name,
          'business_slug', v_business.slug,
          'customer_name', v_customer.full_name
        )
      );
    elsif new.starts_at <> old.starts_at then
      perform public.queue_notification(
        new.business_id, new.id, v_customer.email,
        'booking_rescheduled',
        jsonb_build_object(
          'reference', new.reference,
          'old_starts_at', old.starts_at,
          'starts_at', new.starts_at,
          'service_name', v_service.name,
          'business_name', v_business.name,
          'business_slug', v_business.slug,
          'customer_name', v_customer.full_name
        )
      );
    end if;
  end if;

  return new;
end;
$$;

-- =========================================================
-- 5. Seed: features.emails on plans
-- =========================================================

update public.subscription_plans
set features = jsonb_set(coalesce(features, '{}'::jsonb), '{emails}', 'false'::jsonb, true)
where code = 'free';

update public.subscription_plans
set features = jsonb_set(coalesce(features, '{}'::jsonb), '{emails}', 'true'::jsonb, true)
where code in ('starter_monthly', 'pro_monthly');