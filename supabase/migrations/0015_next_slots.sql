-- 0015_next_slots.sql
-- Returns the next available slots for a given service across the next few
-- days. Used by the public services list to show inline slot chips.

create or replace function public.get_next_slots_for_service(
  p_slug citext,
  p_service_id uuid,
  p_days_ahead int default 7,
  p_max_per_day int default 4
)
returns table (starts_at timestamptz, day date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_tz text;
  v_today date;
  v_limit date;
  d date;
begin
  select * into v_business from public.businesses
    where slug = p_slug and status = 'active';
  if v_business is null then
    raise exception 'business not available' using errcode = '22023';
  end if;

  select * into v_service from public.services
    where id = p_service_id
      and business_id = v_business.id
      and is_active = true
      and online_booking_enabled = true;
  if v_service is null then
    raise exception 'service not available' using errcode = '22023';
  end if;

  v_tz := v_business.timezone;
  v_today := (now() at time zone v_tz)::date;
  v_limit := v_today + make_interval(days => greatest(p_days_ahead, 1));

  for d in
    select generate_series(v_today, v_limit::date, interval '1 day')::date
  loop
    return query
    select s.starts_at, d
    from public.get_availability(
      p_slug, p_service_id, d, null, null
    ) as s
    limit greatest(p_max_per_day, 1);
  end loop;
end;
$$;

revoke all on function public.get_next_slots_for_service(citext, uuid, int, int) from public;
grant execute on function public.get_next_slots_for_service(citext, uuid, int, int) to anon, authenticated;