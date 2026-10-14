-- 0010_reschedule_cancel_policies.sql
-- Customer-side booking management + business policy settings.
--
-- Policies:
--   businesses.reschedule_cutoff_hours  (default 24)
--   businesses.cancel_cutoff_hours      (default 24)
-- Both enforced server-side. Zero means "no cutoff".

alter table public.businesses
  add column if not exists reschedule_cutoff_hours int not null default 24,
  add column if not exists cancel_cutoff_hours int not null default 24;

-- =========================================================
-- Auto-link: after a customer signs in, bind any customers rows
-- matching their email that don't yet have a user_id.
-- =========================================================

create or replace function public.link_customer_by_email()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email citext;
  v_count int := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then
    return 0;
  end if;

  with updated as (
    update public.customers
    set user_id = v_uid, updated_at = now()
    where user_id is null
      and email is not null
      and lower(email::text) = lower(v_email::text)
    returning 1
  )
  select count(*) into v_count from updated;

  return v_count;
end;
$$;

revoke all on function public.link_customer_by_email() from public;
grant execute on function public.link_customer_by_email() to authenticated;

-- =========================================================
-- List my bookings (for the customer dashboard)
-- =========================================================

create or replace function public.get_my_bookings()
returns table (
  id uuid,
  reference text,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  price_cents int,
  currency text,
  business_id uuid,
  business_slug text,
  business_name text,
  business_timezone text,
  service_name text,
  staff_name text,
  location_name text,
  can_reschedule boolean,
  can_cancel boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    a.reference,
    a.status,
    a.starts_at,
    a.ends_at,
    a.price_cents,
    a.currency,
    b.id,
    b.slug,
    b.name,
    b.timezone,
    s.name,
    st.display_name,
    l.name,
    (a.status in ('pending','confirmed')
      and (b.reschedule_cutoff_hours = 0
           or a.starts_at - make_interval(hours => b.reschedule_cutoff_hours) > now())
    ) as can_reschedule,
    (a.status in ('pending','confirmed')
      and (b.cancel_cutoff_hours = 0
           or a.starts_at - make_interval(hours => b.cancel_cutoff_hours) > now())
    ) as can_cancel
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  join public.businesses b on b.id = a.business_id
  join public.services s on s.id = a.service_id
  left join public.staff st on st.id = a.staff_id
  left join public.locations l on l.id = a.location_id
  where c.user_id = auth.uid()
  order by a.starts_at desc;
$$;

revoke all on function public.get_my_bookings() from public;
grant execute on function public.get_my_bookings() to authenticated;

-- =========================================================
-- Reschedule by reference (email-verified)
-- =========================================================

create or replace function public.reschedule_booking_by_reference(
  p_slug citext,
  p_reference text,
  p_email citext,
  p_new_starts_at timestamptz,
  p_new_staff_id uuid default null,
  p_new_location_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_appt public.appointments;
  v_customer public.customers;
  v_service public.services;
  v_duration interval;
  v_buffer_before interval;
  v_buffer_after interval;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_new_ends timestamptz;
  v_staff_id uuid;
  v_location_id uuid;
begin
  if p_email is null or p_new_starts_at is null then
    raise exception 'email and new time required' using errcode = '22023';
  end if;

  select * into v_business from public.businesses where slug = p_slug;
  if v_business is null then
    raise exception 'business not found' using errcode = '22023';
  end if;

  -- Serialize all bookings for this business
  perform 1 from public.businesses where id = v_business.id for update;

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

  if v_appt.status not in ('pending','confirmed') then
    raise exception 'booking cannot be rescheduled' using errcode = '22023';
  end if;

  if v_business.reschedule_cutoff_hours > 0 then
    if v_appt.starts_at - make_interval(hours => v_business.reschedule_cutoff_hours) <= now() then
      raise exception 'reschedule window has passed' using errcode = '22023';
    end if;
  end if;

  select * into v_service from public.services where id = v_appt.service_id;
  if v_service is null then
    raise exception 'service not found' using errcode = '22023';
  end if;

  v_duration := make_interval(mins => v_service.duration_minutes);
  v_buffer_before := make_interval(mins => v_service.buffer_before_minutes);
  v_buffer_after := make_interval(mins => v_service.buffer_after_minutes);
  v_new_ends := p_new_starts_at + v_duration;
  v_window_start := p_new_starts_at - v_buffer_before;
  v_window_end := v_new_ends + v_buffer_after;

  v_staff_id := coalesce(p_new_staff_id, v_appt.staff_id);
  v_location_id := coalesce(p_new_location_id, v_appt.location_id);

  if p_new_starts_at < now() + make_interval(mins => v_business.min_notice_minutes) then
    raise exception 'booking too soon' using errcode = '22023';
  end if;
  if p_new_starts_at > now() + make_interval(days => v_business.max_advance_days) then
    raise exception 'booking too far in advance' using errcode = '22023';
  end if;

  if v_staff_id is not null then
    if not exists (
      select 1 from public.staff s
      join public.staff_services ss on ss.staff_id = s.id
      where s.id = v_staff_id and s.business_id = v_business.id
        and s.is_active = true and ss.service_id = v_service.id
    ) then
      raise exception 'staff cannot perform this service' using errcode = '22023';
    end if;
  end if;

  -- Conflict check (excluding this appointment itself)
  if exists (
    select 1 from public.appointments a
    where a.business_id = v_business.id
      and a.id <> v_appt.id
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

  if v_staff_id is not null and exists (
    select 1 from public.staff_time_off sto
    where sto.staff_id = v_staff_id
      and tstzrange(sto.starts_at, sto.ends_at, '[)')
          && tstzrange(p_new_starts_at, v_new_ends, '[)')
  ) then
    raise exception 'staff unavailable' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.business_closures bc
    where bc.business_id = v_business.id
      and (bc.location_id is null or bc.location_id = v_location_id)
      and tstzrange(bc.starts_at, bc.ends_at, '[)')
          && tstzrange(p_new_starts_at, v_new_ends, '[)')
  ) then
    raise exception 'business closed at that time' using errcode = '22023';
  end if;

  update public.appointments
  set starts_at = p_new_starts_at,
      ends_at = v_new_ends,
      staff_id = v_staff_id,
      location_id = v_location_id,
      status = case when v_business.auto_confirm_bookings then 'confirmed' else 'pending' end,
      updated_at = now()
  where id = v_appt.id;

  insert into public.appointment_events (appointment_id, event_type, actor_kind, metadata)
  values (v_appt.id, 'rescheduled', 'customer',
          jsonb_build_object('email', p_email,
                             'old_starts_at', v_appt.starts_at,
                             'new_starts_at', p_new_starts_at));

  return jsonb_build_object('reference', v_appt.reference,
                            'starts_at', p_new_starts_at,
                            'status', (case when v_business.auto_confirm_bookings
                                            then 'confirmed' else 'pending' end));
end;
$$;

revoke all on function public.reschedule_booking_by_reference(
  citext, text, citext, timestamptz, uuid, uuid
) from public;
grant execute on function public.reschedule_booking_by_reference(
  citext, text, citext, timestamptz, uuid, uuid
) to anon, authenticated;

-- =========================================================
-- Replace cancel RPC so it also enforces the cancel cutoff
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

  select * into v_business from public.businesses where slug = p_slug;
  if v_business is null then
    raise exception 'business not found' using errcode = '22023';
  end if;

  perform 1 from public.businesses where id = v_business.id for update;

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

  if v_business.cancel_cutoff_hours > 0 then
    if v_appt.starts_at - make_interval(hours => v_business.cancel_cutoff_hours) <= now() then
      raise exception 'cancellation window has passed' using errcode = '22023';
    end if;
  end if;

  update public.appointments
  set status = 'cancelled',
      cancelled_reason = 'customer cancelled',
      updated_at = now()
  where id = v_appt.id;

  insert into public.appointment_events (appointment_id, event_type, actor_kind, metadata)
  values (v_appt.id, 'cancelled', 'customer',
          jsonb_build_object('email', p_email));

  return jsonb_build_object('reference', v_appt.reference, 'status', 'cancelled');
end;
$$;

revoke all on function public.cancel_booking_by_reference(citext, text, citext) from public;
grant execute on function public.cancel_booking_by_reference(citext, text, citext) to anon, authenticated;

-- =========================================================
-- Queue a notification (email sending is deferred to the final phase;
-- this records the intent so nothing is lost when Resend is wired up).
-- =========================================================

create or replace function public.queue_notification(
  p_business_id uuid,
  p_appointment_id uuid,
  p_recipient_email citext,
  p_template text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (
    business_id, appointment_id, recipient_email,
    channel, template, status, payload
  ) values (
    p_business_id, p_appointment_id, p_recipient_email,
    'email', p_template, 'queued', coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.queue_notification(uuid, uuid, citext, text, jsonb) from public;

-- Hook notifications into booking lifecycle. These are trigger-based so
-- they fire regardless of whether the caller is the public RPC or the
-- business dashboard.

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
begin
  select * into v_customer from public.customers where id = new.customer_id;
  select * into v_business from public.businesses where id = new.business_id;
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

drop trigger if exists appointment_notify on public.appointments;
create trigger appointment_notify
  after insert or update on public.appointments
  for each row execute procedure public.tg_appointment_notify();

-- =========================================================
-- Business settings update (owner only, whitelisted columns)
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
    name                  = coalesce(nullif(p_patch->>'name', ''), b.name),
    description           = coalesce(p_patch->>'description', b.description),
    logo_url              = coalesce(p_patch->>'logo_url', b.logo_url),
    contact_email         = coalesce(nullif(p_patch->>'contact_email', '')::citext, b.contact_email),
    contact_phone         = coalesce(p_patch->>'contact_phone', b.contact_phone),
    timezone              = coalesce(nullif(p_patch->>'timezone', ''), b.timezone),
    currency              = coalesce(nullif(p_patch->>'currency', ''), b.currency),
    locale                = coalesce(nullif(p_patch->>'locale', ''), b.locale),
    guest_booking_enabled = coalesce((p_patch->>'guest_booking_enabled')::boolean, b.guest_booking_enabled),
    auto_confirm_bookings = coalesce((p_patch->>'auto_confirm_bookings')::boolean, b.auto_confirm_bookings),
    min_notice_minutes    = coalesce((p_patch->>'min_notice_minutes')::int, b.min_notice_minutes),
    max_advance_days      = coalesce((p_patch->>'max_advance_days')::int, b.max_advance_days),
    reschedule_cutoff_hours = coalesce((p_patch->>'reschedule_cutoff_hours')::int, b.reschedule_cutoff_hours),
    cancel_cutoff_hours     = coalesce((p_patch->>'cancel_cutoff_hours')::int, b.cancel_cutoff_hours)
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