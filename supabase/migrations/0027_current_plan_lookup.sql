-- 0027_current_plan_lookup.sql
-- Returns the caller's business plan + current usage counts for the
-- billing page.

create or replace function public.business_billing_summary(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result jsonb;
  v_plan public.subscription_plans;
begin
  if not public.is_business_member(p_business_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select sp.* into v_plan
  from public.subscription_plans sp
  join public.businesses b on b.current_plan_id = sp.id
  where b.id = p_business_id;

  select jsonb_build_object(
    'plan', case when v_plan.id is null then null else
      jsonb_build_object(
        'id', v_plan.id,
        'code', v_plan.code,
        'name', v_plan.name,
        'interval', v_plan.interval,
        'price_cents', v_plan.price_cents,
        'currency', v_plan.currency,
        'features', v_plan.features,
        'max_staff', v_plan.max_staff,
        'max_services', v_plan.max_services,
        'max_locations', v_plan.max_locations,
        'max_appointments_per_month', v_plan.max_appointments_per_month
      )
    end,
    'usage', jsonb_build_object(
      'staff', (select count(*) from public.staff where business_id = p_business_id),
      'services', (select count(*) from public.services where business_id = p_business_id),
      'locations', (select count(*) from public.locations where business_id = p_business_id),
      'appointments_this_month', (
        select count(*) from public.appointments
        where business_id = p_business_id
          and starts_at >= date_trunc('month', now())
      )
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.business_billing_summary(uuid) from public;
grant execute on function public.business_billing_summary(uuid) to authenticated;