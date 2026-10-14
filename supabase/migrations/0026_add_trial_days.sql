-- 0026_add_trial_days.sql
-- Add trial_days to Starter and Pro plan features.

update public.subscription_plans
set features = jsonb_set(
  coalesce(features, '{}'::jsonb),
  '{trial_days}',
  to_jsonb(7),
  true
)
where code in ('starter_monthly', 'pro_monthly');