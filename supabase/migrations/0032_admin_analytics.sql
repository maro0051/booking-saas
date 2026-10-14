-- 0032_admin_analytics.sql
-- Platform analytics for the admin dashboard: KPI trend over the last 30
-- days, and a breakdown of businesses by plan.

create or replace function public.admin_dashboard_analytics()
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
    'days', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day,
        'new_businesses', d.new_businesses,
        'new_customers', d.new_customers,
        'bookings', d.bookings,
        'revenue_cents', d.revenue_cents
      ) order by d.day), '[]'::jsonb)
      from (
        with days as (
          select generate_series(
            (current_date - interval '29 days')::date,
            current_date,
            interval '1 day'
          )::date as day
        )
        select
          days.day,
          (select count(*) from public.businesses b where b.created_at::date = days.day) as new_businesses,
          (select count(*) from public.customers c where c.created_at::date = days.day) as new_customers,
          (select count(*) from public.appointments a where a.created_at::date = days.day) as bookings,
          (select coalesce(sum(p.amount_cents),0)
             from public.payments p
             where p.status = 'succeeded'
               and p.created_at::date = days.day) as revenue_cents
        from days
      ) d
    ),
    'plan_breakdown', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'plan_name', pb.plan_name,
        'plan_code', pb.plan_code,
        'count', pb.count
      )), '[]'::jsonb)
      from (
        select sp.name as plan_name, sp.code as plan_code, count(b.id) as count
        from public.subscription_plans sp
        left join public.businesses b on b.current_plan_id = sp.id
        group by sp.id, sp.name, sp.code
      ) pb
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_analytics() from public;
grant execute on function public.admin_dashboard_analytics() to authenticated;