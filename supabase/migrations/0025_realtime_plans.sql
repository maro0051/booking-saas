-- 0025_realtime_plans.sql
-- Guarantee that subscription_plans is in supabase_realtime and readable
-- by anon visitors so the pricing page updates live.

-- 1. Ensure publication exists (Supabase normally creates it, but be safe).
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

-- 2. Add subscription_plans to the publication if not already there.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'subscription_plans'
  ) then
    alter publication supabase_realtime add table public.subscription_plans;
  end if;
end $$;

-- 3. Make sure RLS allows public read on active plans.
drop policy if exists subscription_plans_select on public.subscription_plans;
create policy subscription_plans_select on public.subscription_plans
  for select using (is_active = true or public.is_super_admin());

-- 4. Set REPLICA IDENTITY FULL so realtime sends the full row.
alter table public.subscription_plans replica identity full;