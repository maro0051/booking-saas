-- 0023_plans_public_rls.sql
-- Public read RPC for pricing + realtime on plan changes.
-- NOTE: "interval" is a Postgres keyword, so it must be quoted when used
-- as a column name inside a RETURNS TABLE declaration.

-- 1. Safe RPC for the public pricing page.
drop function if exists public.list_public_plans();

create or replace function public.list_public_plans()
returns table (
  id uuid,
  code text,
  name text,
  "interval" text,
  price_cents int,
  currency text,
  features jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    id,
    code,
    name,
    "interval" as "interval",
    price_cents,
    currency,
    features
  from public.subscription_plans
  where is_active = true
  order by price_cents asc;
$$;

revoke all on function public.list_public_plans() from public;
grant execute on function public.list_public_plans() to anon, authenticated;

-- 2. Enable realtime on subscription_plans so the public pricing page
--    updates when an admin toggles or edits a plan. Safe to run repeatedly.
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