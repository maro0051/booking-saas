-- 0036_notification_matrix.sql
-- Adds business and admin notification triggers + per-business prefs.

-- =========================================================
-- 1. Per-business notification preferences
-- =========================================================

alter table public.businesses
  add column if not exists notify_new_booking boolean not null default true,
  add column if not exists notify_booking_cancelled boolean not null default true,
  add column if not exists notify_time_off_request boolean not null default true;

-- =========================================================
-- 2. Helper: queue a notification to the business owner(s)
-- =========================================================

create or replace function public.queue_to_business_owners(
  p_business_id uuid,
  p_appointment_id uuid,
  p_template text,
  p_payload jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select u.email
    from public.business_members m
    join auth.users u on u.id = m.user_id
    where m.business_id = p_business_id
      and m.role = 'owner'
      and m.status = 'active'
      and u.email is not null
  loop
    insert into public.notifications (
      business_id, appointment_id, recipient_email,
      channel, template, status, payload
    ) values (
      p_business_id, p_appointment_id, r.email,
      'email', p_template, 'queued', coalesce(p_payload, '{}'::jsonb)
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.queue_to_business_owners(uuid, uuid, text, jsonb) from public;

-- =========================================================
-- 3. Helper: queue a notification to every super admin
-- =========================================================

create or replace function public.queue_to_admins(
  p_template text,
  p_payload jsonb,
  p_business_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select u.email
    from public.admin_users au
    join auth.users u on u.id = au.user_id
    where u.email is not null
  loop
    insert into public.notifications (
      business_id, appointment_id, recipient_email,
      channel, template, status, payload
    ) values (
      p_business_id, null, r.email,
      'email', p_template, 'queued', coalesce(p_payload, '{}'::jsonb)
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.queue_to_admins(text, jsonb, uuid) from public;

-- =========================================================
-- 4. Trigger: appointment changes notify the business owner
-- =========================================================

create or replace function public.tg_appointment_notify_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_customer public.customers;
  v_service public.services;
begin
  select * into v_business from public.businesses where id = new.business_id;
  if v_business is null then return new; end if;

  select * into v_customer from public.customers where id = new.customer_id;
  select * into v_service from public.services where id = new.service_id;

  if tg_op = 'INSERT' then
    if v_business.notify_new_booking then
      perform public.queue_to_business_owners(
        new.business_id,
        new.id,
        'business_new_booking',
        jsonb_build_object(
          'reference', new.reference,
          'starts_at', new.starts_at,
          'ends_at', new.ends_at,
          'status', new.status,
          'service_name', v_service.name,
          'business_name', v_business.name,
          'business_slug', v_business.slug,
          'customer_name', v_customer.full_name,
          'customer_email', v_customer.email,
          'customer_phone', v_customer.phone
        )
      );
    end if;
  elsif tg_op = 'UPDATE' then
    -- Customer cancelled the booking (status change to cancelled by non-business actor)
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      if v_business.notify_booking_cancelled then
        perform public.queue_to_business_owners(
          new.business_id,
          new.id,
          'business_booking_cancelled',
          jsonb_build_object(
            'reference', new.reference,
            'starts_at', new.starts_at,
            'service_name', v_service.name,
            'business_name', v_business.name,
            'business_slug', v_business.slug,
            'customer_name', v_customer.full_name,
            'cancelled_reason', new.cancelled_reason
          )
        );
      end if;
    end if;

    -- Customer rescheduled (starts_at changed)
    if new.starts_at <> old.starts_at and new.status <> 'cancelled' then
      perform public.queue_to_business_owners(
        new.business_id,
        new.id,
        'business_booking_rescheduled',
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

drop trigger if exists appointment_notify_business on public.appointments;
create trigger appointment_notify_business
  after insert or update on public.appointments
  for each row execute function public.tg_appointment_notify_business();

-- =========================================================
-- 5. Trigger: time-off requests notify the business owner
-- =========================================================

create or replace function public.tg_time_off_notify_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_staff public.staff;
begin
  if tg_op <> 'INSERT' then return new; end if;

  select * into v_business from public.businesses where id = new.business_id;
  if v_business is null or not v_business.notify_time_off_request then
    return new;
  end if;

  select * into v_staff from public.staff where id = new.staff_id;

  perform public.queue_to_business_owners(
    new.business_id,
    null,
    'business_time_off_request',
    jsonb_build_object(
      'request_id', new.id,
      'staff_name', v_staff.display_name,
      'starts_at', new.starts_at,
      'ends_at', new.ends_at,
      'reason', new.reason,
      'business_name', v_business.name,
      'business_slug', v_business.slug
    )
  );

  return new;
end;
$$;

drop trigger if exists time_off_notify_business on public.time_off_requests;
create trigger time_off_notify_business
  after insert on public.time_off_requests
  for each row execute function public.tg_time_off_notify_business();

-- =========================================================
-- 6. Trigger: new business signup notifies all admins
-- =========================================================

create or replace function public.tg_new_business_notify_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only fire when the business is first created (status can be pending or
  -- active depending on onboarding), and only once per row.
  if tg_op = 'INSERT' then
    perform public.queue_to_admins(
      'admin_new_business',
      jsonb_build_object(
        'business_id', new.id,
        'business_name', new.name,
        'business_slug', new.slug,
        'contact_email', new.contact_email,
        'timezone', new.timezone,
        'created_at', new.created_at
      ),
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists new_business_notify_admins on public.businesses;
create trigger new_business_notify_admins
  after insert on public.businesses
  for each row execute function public.tg_new_business_notify_admins();

-- =========================================================
-- 7. Trigger: support requests notify all admins
-- =========================================================

create or replace function public.tg_support_notify_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_user_email citext;
begin
  if tg_op <> 'INSERT' then return new; end if;

  if new.business_id is not null then
    select * into v_business from public.businesses where id = new.business_id;
  end if;

  if new.user_id is not null then
    select email into v_user_email from auth.users where id = new.user_id;
  end if;

  perform public.queue_to_admins(
    'admin_support_request',
    jsonb_build_object(
      'request_id', new.id,
      'subject', new.subject,
      'body', new.body,
      'priority', new.priority,
      'business_name', v_business.name,
      'user_email', v_user_email
    ),
    new.business_id
  );

  return new;
end;
$$;

drop trigger if exists support_notify_admins on public.support_requests;
create trigger support_notify_admins
  after insert on public.support_requests
  for each row execute function public.tg_support_notify_admins();

-- =========================================================
-- 8. Update update_business_settings to accept the new prefs
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
    require_account_to_book = coalesce((p_patch->>'require_account_to_book')::boolean, b.require_account_to_book),
    notify_new_booking      = coalesce((p_patch->>'notify_new_booking')::boolean, b.notify_new_booking),
    notify_booking_cancelled = coalesce((p_patch->>'notify_booking_cancelled')::boolean, b.notify_booking_cancelled),
    notify_time_off_request = coalesce((p_patch->>'notify_time_off_request')::boolean, b.notify_time_off_request)
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