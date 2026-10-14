-- 0030_graceful_downgrade.sql
-- Adds a business RPC that switches plans and gracefully deactivates
-- resources when the new plan has lower limits.

create or replace function public.switch_business_plan(
  p_business_id uuid,
  p_plan_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_plan uuid;
  v_plan public.subscription_plans;
  v_business public.businesses;
  v_disabled_staff uuid[] := '{}';
  v_disabled_services uuid[] := '{}';
  v_disabled_locations uuid[] := '{}';
  v_count int;
  v_excess int;
  v_id uuid;
begin
  if not public.is_business_owner(p_business_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select current_plan_id into v_old_plan from public.businesses
    where id = p_business_id;

  select * into v_plan from public.subscription_plans
    where id = p_plan_id and is_active = true;
  if v_plan is null then
    raise exception 'plan not available' using errcode = '22023';
  end if;

  -- Update the business's current plan.
  update public.businesses
  set current_plan_id = p_plan_id, updated_at = now()
  where id = p_business_id
  returning * into v_business;

  -- =====================================================
  -- Graceful deactivation — keep the OLDEST, disable the newest.
  -- =====================================================

  -- Staff
  if v_plan.max_staff is not null and v_plan.max_staff > 0 then
    select count(*) into v_count from public.staff
      where business_id = p_business_id and is_active = true;
    v_excess := v_count - v_plan.max_staff;
    if v_excess > 0 then
      for v_id in
        select id from public.staff
        where business_id = p_business_id and is_active = true
        order by created_at desc
        limit v_excess
      loop
        update public.staff set is_active = false where id = v_id;
        v_disabled_staff := array_append(v_disabled_staff, v_id);
      end loop;
    end if;
  end if;

  -- Services
  if v_plan.max_services is not null and v_plan.max_services > 0 then
    select count(*) into v_count from public.services
      where business_id = p_business_id and is_active = true;
    v_excess := v_count - v_plan.max_services;
    if v_excess > 0 then
      for v_id in
        select id from public.services
        where business_id = p_business_id and is_active = true
        order by created_at desc
        limit v_excess
      loop
        update public.services set is_active = false where id = v_id;
        v_disabled_services := array_append(v_disabled_services, v_id);
      end loop;
    end if;
  end if;

  -- Locations
  if v_plan.max_locations is not null and v_plan.max_locations > 0 then
    select count(*) into v_count from public.locations
      where business_id = p_business_id and is_active = true;
    v_excess := v_count - v_plan.max_locations;
    if v_excess > 0 then
      for v_id in
        select id from public.locations
        where business_id = p_business_id and is_active = true
        order by created_at desc
        limit v_excess
      loop
        update public.locations set is_active = false where id = v_id;
        v_disabled_locations := array_append(v_disabled_locations, v_id);
      end loop;
    end if;
  end if;

  -- =====================================================
  -- Audit
  -- =====================================================

  insert into public.audit_logs (actor_user_id, actor_role, business_id, action, target_table, target_id, metadata)
  values (auth.uid(), 'business_owner', p_business_id, 'business.plan_change',
          'businesses', p_business_id::text,
          jsonb_build_object(
            'old_plan_id', v_old_plan,
            'new_plan_id', p_plan_id,
            'new_plan_code', v_plan.code,
            'disabled_staff', v_disabled_staff,
            'disabled_services', v_disabled_services,
            'disabled_locations', v_disabled_locations
          ));

  return jsonb_build_object(
    'plan_id', p_plan_id,
    'plan_code', v_plan.code,
    'plan_name', v_plan.name,
    'disabled', jsonb_build_object(
      'staff', to_jsonb(v_disabled_staff),
      'services', to_jsonb(v_disabled_services),
      'locations', to_jsonb(v_disabled_locations)
    ),
    'disabled_count',
      coalesce(array_length(v_disabled_staff, 1), 0)
      + coalesce(array_length(v_disabled_services, 1), 0)
      + coalesce(array_length(v_disabled_locations, 1), 0)
  );
end;
$$;

revoke all on function public.switch_business_plan(uuid, uuid) from public;
grant execute on function public.switch_business_plan(uuid, uuid) to authenticated;

-- Also relax the trigger so it doesn't try to reject updates that are just
-- toggling is_active from true → false during a downgrade.
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

  -- Ignore changes that disable a row.
  if (tg_op = 'UPDATE' and old.is_active = true and new.is_active = false) then
    return new;
  end if;
  if new.is_active = false then
    return new;
  end if;

  -- On UPDATE where it's already active → active and nothing meaningful
  -- changed, don't re-check limits.
  if (tg_op = 'UPDATE' and old.is_active = true and new.is_active = true) then
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