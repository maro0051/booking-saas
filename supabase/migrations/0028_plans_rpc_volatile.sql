-- 0028_plans_rpc_volatile.sql
-- Make list_public_plans VOLATILE so PostgREST and the browser don't cache
-- the response. VOLATILE functions are re-evaluated on every call.

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
volatile
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