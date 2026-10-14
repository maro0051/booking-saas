-- 0011_admin_functions.sql
-- Super admin RPCs. Every function checks is_super_admin() and writes an
-- audit_logs row. Callers cannot supply business_id checks or role flags.

-- =========================================================
-- Platform stats
-- =========================================================

create or replace function public.admin_platform_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'businesses', (select count(*) from public.businesses),
    'businesses_active', (select count(*) from public.businesses where status='active'),
    'businesses_suspended', (select count(*) from public.businesses where status='suspended'),
    'businesses_pending', (select count(*) from public.businesses where status='pending'),
    'customers', (select count(*) from public.customers),
    'appointments_total', (select count(*) from public.appointments),
    'appointments_30d', (select count(*) from public.appointments where created_at > now() - interval '30 days'),
    'appointments_confirmed', (select count(*) from public.appointments where status='confirmed'),
    'subscriptions_active', (select count(*) from public.subscriptions where status in ('active','trialing')),
    'revenue_cents_30d', (
      select coalesce(sum(amount_cents),0) from public.payments
      where status='succeeded' and created_at > now() - interval '30 days'
    ),
    'support_open', (select count(*) from public.support_requests where status='open')
  ) into v_result;

  return v_result;
end;
$$;
revoke all on function public.admin_platform_stats() from public;
grant execute on function public.admin_platform_stats() to authenticated;

-- =========================================================
-- Business directory
-- =========================================================

create or replace function public.admin_list_businesses(
  p_search text default null,
  p_status text default null,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid, slug citext, name text, status text, created_at timestamptz,
  contact_email citext, timezone text, currency text,
  members_count bigint, appointments_count bigint, total_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  with base as (
    select b.*
    from public.businesses b
    where (p_search is null or p_search = ''
           or b.name ilike '%'||p_search||'%'
           or b.slug::text ilike '%'||p_search||'%')
      and (p_status is null or p_status = '' or b.status = p_status)
  )
  select
    b.id, b.slug, b.name, b.status, b.created_at,
    b.contact_email, b.timezone, b.currency,
    (select count(*) from public.business_members m where m.business_id = b.id) as members_count,
    (select count(*) from public.appointments a where a.business_id = b.id) as appointments_count,
    (select count(*) from base) as total_count
  from base b
  order by b.created_at desc
  limit greatest(p_limit,1) offset greatest(p_offset,0);
end;
$$;
revoke all on function public.admin_list_businesses(text, text, int, int) from public;
grant execute on function public.admin_list_businesses(text, text, int, int) to authenticated;

create or replace function public.admin_get_business(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_business jsonb;
  v_members jsonb;
  v_recent jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select to_jsonb(b) into v_business
  from public.businesses b where b.id = p_business_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'user_id', m.user_id, 'role', m.role,
    'status', m.status, 'created_at', m.created_at,
    'email', u.email
  ) order by m.created_at), '[]'::jsonb)
  into v_members
  from public.business_members m
  join auth.users u on u.id = m.user_id
  where m.business_id = p_business_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'reference', a.reference, 'status', a.status,
    'starts_at', a.starts_at, 'created_at', a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select * from public.appointments
    where business_id = p_business_id
    order by created_at desc limit 20
  ) a;

  return jsonb_build_object(
    'business', v_business,
    'members', v_members,
    'recent_appointments', v_recent
  );
end;
$$;
revoke all on function public.admin_get_business(uuid) from public;
grant execute on function public.admin_get_business(uuid) to authenticated;

create or replace function public.admin_set_business_status(
  p_business_id uuid,
  p_status text
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_status not in ('pending','active','suspended','closed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.businesses
  set status = p_status, updated_at = now()
  where id = p_business_id
  returning * into v_business;

  if v_business is null then
    raise exception 'business not found' using errcode = '22023';
  end if;

  insert into public.audit_logs (actor_user_id, actor_role, business_id, action, target_table, target_id, metadata)
  values (auth.uid(), 'super_admin', p_business_id,
          'business.status_change', 'businesses', p_business_id::text,
          jsonb_build_object('status', p_status));

  return v_business;
end;
$$;
revoke all on function public.admin_set_business_status(uuid, text) from public;
grant execute on function public.admin_set_business_status(uuid, text) to authenticated;

-- =========================================================
-- Subscription plans
-- =========================================================

create or replace function public.admin_list_plans()
returns setof public.subscription_plans
language plpgsql security definer set search_path = public stable
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query select * from public.subscription_plans order by price_cents;
end;
$$;
grant execute on function public.admin_list_plans() to authenticated;

create or replace function public.admin_upsert_plan(p_plan jsonb)
returns public.subscription_plans
language plpgsql security definer set search_path = public
as $$
declare
  v_plan public.subscription_plans;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if (p_plan->>'id') is not null then
    update public.subscription_plans set
      code = coalesce(p_plan->>'code', code),
      name = coalesce(p_plan->>'name', name),
      interval = coalesce(p_plan->>'interval', interval),
      price_cents = coalesce((p_plan->>'price_cents')::int, price_cents),
      currency = coalesce(p_plan->>'currency', currency),
      stripe_price_id = coalesce(p_plan->>'stripe_price_id', stripe_price_id),
      max_staff = coalesce((p_plan->>'max_staff')::int, max_staff),
      max_services = coalesce((p_plan->>'max_services')::int, max_services),
      max_locations = coalesce((p_plan->>'max_locations')::int, max_locations),
      max_appointments_per_month = coalesce((p_plan->>'max_appointments_per_month')::int, max_appointments_per_month),
      features = coalesce((p_plan->'features'), features),
      is_active = coalesce((p_plan->>'is_active')::boolean, is_active)
    where id = (p_plan->>'id')::uuid
    returning * into v_plan;
  else
    insert into public.subscription_plans (
      code, name, interval, price_cents, currency, stripe_price_id,
      max_staff, max_services, max_locations, max_appointments_per_month,
      features, is_active
    ) values (
      p_plan->>'code', p_plan->>'name', p_plan->>'interval',
      coalesce((p_plan->>'price_cents')::int, 0),
      coalesce(p_plan->>'currency', 'CAD'),
      p_plan->>'stripe_price_id',
      (p_plan->>'max_staff')::int, (p_plan->>'max_services')::int,
      (p_plan->>'max_locations')::int, (p_plan->>'max_appointments_per_month')::int,
      coalesce(p_plan->'features', '{}'::jsonb),
      coalesce((p_plan->>'is_active')::boolean, true)
    ) returning * into v_plan;
  end if;

  insert into public.audit_logs (actor_user_id, actor_role, action, target_table, target_id, metadata)
  values (auth.uid(), 'super_admin', 'plan.upsert', 'subscription_plans', v_plan.id::text, p_plan);

  return v_plan;
end;
$$;
grant execute on function public.admin_upsert_plan(jsonb) to authenticated;

-- =========================================================
-- Support requests
-- =========================================================

create or replace function public.admin_list_support(
  p_status text default null,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid, subject text, body text, status text, priority text,
  business_id uuid, business_name text, user_id uuid, user_email citext,
  created_at timestamptz, updated_at timestamptz, total_count bigint
)
language plpgsql security definer set search_path = public stable
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  with base as (
    select sr.* from public.support_requests sr
    where p_status is null or p_status = '' or sr.status = p_status
  )
  select sr.id, sr.subject, sr.body, sr.status, sr.priority,
         sr.business_id, b.name, sr.user_id, u.email,
         sr.created_at, sr.updated_at,
         (select count(*) from base) as total_count
  from base sr
  left join public.businesses b on b.id = sr.business_id
  left join auth.users u on u.id = sr.user_id
  order by sr.created_at desc
  limit greatest(p_limit,1) offset greatest(p_offset,0);
end;
$$;
grant execute on function public.admin_list_support(text, int, int) to authenticated;

create or replace function public.admin_update_support(
  p_id uuid, p_status text, p_priority text default null
)
returns public.support_requests
language plpgsql security definer set search_path = public
as $$
declare
  v_row public.support_requests;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('open','in_progress','resolved','closed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.support_requests
  set status = p_status,
      priority = coalesce(p_priority, priority),
      updated_at = now()
  where id = p_id
  returning * into v_row;

  insert into public.audit_logs (actor_user_id, actor_role, action, target_table, target_id, metadata)
  values (auth.uid(), 'super_admin', 'support.update', 'support_requests', p_id::text,
          jsonb_build_object('status', p_status));

  return v_row;
end;
$$;
grant execute on function public.admin_update_support(uuid, text, text) to authenticated;

-- =========================================================
-- Audit logs
-- =========================================================

create or replace function public.admin_list_audit_logs(
  p_action text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id bigint, actor_user_id uuid, actor_role text, action text,
  business_id uuid, business_name text, target_table text, target_id text,
  metadata jsonb, created_at timestamptz, total_count bigint
)
language plpgsql security definer set search_path = public stable
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  with base as (
    select al.* from public.audit_logs al
    where p_action is null or p_action = '' or al.action ilike p_action||'%'
  )
  select al.id, al.actor_user_id, al.actor_role, al.action,
         al.business_id, b.name, al.target_table, al.target_id,
         al.metadata, al.created_at,
         (select count(*) from base) as total_count
  from base al
  left join public.businesses b on b.id = al.business_id
  order by al.created_at desc
  limit greatest(p_limit,1) offset greatest(p_offset,0);
end;
$$;
grant execute on function public.admin_list_audit_logs(text, int, int) to authenticated;

-- =========================================================
-- Admins
-- =========================================================

create or replace function public.admin_list_admins()
returns table (user_id uuid, email citext, granted_at timestamptz, granted_by uuid, notes text)
language plpgsql security definer set search_path = public stable
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select au.user_id, u.email, au.granted_at, au.granted_by, au.notes
  from public.admin_users au
  join auth.users u on u.id = au.user_id
  order by au.granted_at desc;
end;
$$;
grant execute on function public.admin_list_admins() to authenticated;