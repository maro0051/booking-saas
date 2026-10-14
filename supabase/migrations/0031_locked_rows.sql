-- 0031_locked_rows.sql
-- Reject UPDATEs to inactive rows while the business is at its plan cap.
-- Delete is still allowed. Reactivation is blocked by the existing trigger.

create or replace function public.tg_lock_inactive_over_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource text;
  v_can_add boolean;
  v_limits jsonb;
  v_new jsonb;
  v_old jsonb;
begin
  if tg_table_name = 'staff' then v_resource := 'staff';
  elsif tg_table_name = 'services' then v_resource := 'services';
  elsif tg_table_name = 'locations' then v_resource := 'locations';
  else return new;
  end if;

  -- Only applies when the row was already inactive.
  if old.is_active = true then
    return new;
  end if;

  v_limits := public.business_plan_limits(new.business_id);
  v_can_add := coalesce((v_limits->'can_add'->>v_resource)::boolean, true);

  if v_can_add then
    return new;
  end if;

  -- At cap and row is inactive. Allow only no-op updates (nothing changed
  -- besides is_active and updated_at).
  v_new := to_jsonb(new) - 'is_active' - 'updated_at';
  v_old := to_jsonb(old) - 'is_active' - 'updated_at';

  if v_new = v_old then
    return new;
  end if;

  raise exception 'this % is locked. Delete it or upgrade your plan to edit it.', v_resource
    using errcode = '23514';
end;
$$;

drop trigger if exists staff_lock_inactive_over_cap on public.staff;
create trigger staff_lock_inactive_over_cap
  before update on public.staff
  for each row execute function public.tg_lock_inactive_over_cap();

drop trigger if exists services_lock_inactive_over_cap on public.services;
create trigger services_lock_inactive_over_cap
  before update on public.services
  for each row execute function public.tg_lock_inactive_over_cap();

drop trigger if exists locations_lock_inactive_over_cap on public.locations;
create trigger locations_lock_inactive_over_cap
  before update on public.locations
  for each row execute function public.tg_lock_inactive_over_cap();