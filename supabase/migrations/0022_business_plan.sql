-- 0022_business_plan.sql
-- Adds businesses.current_plan_id and seeds three default plans.

alter table public.businesses
  add column if not exists current_plan_id uuid references public.subscription_plans(id);

-- Seed plans (idempotent by code)
insert into public.subscription_plans
  (code, name, interval, price_cents, currency,
   max_staff, max_services, max_locations, max_appointments_per_month,
   features, is_active)
values
  ('free', 'Free', 'none', 0, 'CAD',
   1, 3, 1, 50,
   '{"highlight":"Try it out","bullets":["1 staff member","3 services","1 location","Up to 50 appointments per month"]}'::jsonb,
   true),
  ('starter_monthly', 'Starter', 'month', 1900, 'CAD',
   3, 10, 2, 500,
   '{"highlight":"For growing teams","bullets":["Up to 3 staff","10 services","2 locations","500 appointments per month","Email reminders"]}'::jsonb,
   true),
  ('pro_monthly', 'Pro', 'month', 4900, 'CAD',
   10, 50, 5, 5000,
   '{"highlight":"For busy businesses","bullets":["Up to 10 staff","50 services","5 locations","5,000 appointments per month","Priority support","Custom booking page"]}'::jsonb,
   true)
on conflict (code) do update
  set name = excluded.name,
      interval = excluded.interval,
      price_cents = excluded.price_cents,
      currency = excluded.currency,
      max_staff = excluded.max_staff,
      max_services = excluded.max_services,
      max_locations = excluded.max_locations,
      max_appointments_per_month = excluded.max_appointments_per_month,
      features = excluded.features,
      is_active = excluded.is_active;

-- Public read of active plans is already granted in 0003.