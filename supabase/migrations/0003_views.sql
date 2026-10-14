-- 0003_views.sql
-- Safe public-facing views (no RLS required for anon SELECT on views,
-- but we grant explicitly).

create or replace view public.public_booking_businesses as
select
  id, slug, name, description, logo_url,
  timezone, currency, locale,
  guest_booking_enabled, min_notice_minutes, max_advance_days
from public.businesses
where status = 'active';

create or replace view public.public_booking_services as
select
  s.id, s.business_id, s.name, s.description,
  s.duration_minutes, s.price_cents, s.currency,
  s.buffer_before_minutes, s.buffer_after_minutes
from public.services s
join public.businesses b on b.id = s.business_id
where s.is_active = true
  and s.online_booking_enabled = true
  and b.status = 'active';

grant select on public.public_booking_businesses to anon, authenticated;
grant select on public.public_booking_services  to anon, authenticated;

-- Allow anon to read active subscription plans for a pricing page.
grant select on public.subscription_plans to anon, authenticated;
