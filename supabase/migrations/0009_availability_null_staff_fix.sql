-- 0009_availability_null_staff_fix.sql
-- Availability must also hide slots taken by a null-staff appointment
-- for the same business.

create or replace function public.get_availability(
  p_slug citext,
  p_service_id uuid,
  p_date date,
  p_staff_id uuid default null,
  p_location_id uuid default null
)
returns table (starts_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
  v_service public.services;
  v_tz text;
  v_min_notice interval;
  v_max_advance interval;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_step interval := interval '15 minutes';
  v_slot_duration interval;
  v_bh_open time;
  v_bh_close time;
  v_weekday int;
begin
  select * into v_business from public.businesses
    where slug = p_slug and status = 'active';
  if v_business is null then
    raise exception 'business not available' using errcode = '22023';
  end if;

  v_tz := v_business.timezone;
  v_min_notice := make_interval(mins => v_business.min_notice_minutes);
  v_max_advance := make_interval(days => v_business.max_advance_days);

  select * into v_service from public.services
    where id = p_service_id
      and business_id = v_business.id
      and is_active = true
      and online_booking_enabled = true;
  if v_service is null then
    raise exception 'service not available' using errcode = '22023';
  end if;

  if p_staff_id is not null then
    if not exists (
      select 1 from public.staff s
      join public.staff_services ss on ss.staff_id = s.id
      where s.id = p_staff_id
        and s.business_id = v_business.id
        and s.is_active = true
        and ss.service_id = v_service.id
    ) then
      raise exception 'staff cannot perform this service' using errcode = '22023';
    end if;
  end if;

  if p_location_id is not null then
    if not exists (
      select 1 from public.locations
      where id = p_location_id and business_id = v_business.id and is_active
    ) then
      raise exception 'location not available' using errcode = '22023';
    end if;
  end if;

  v_weekday := extract(dow from p_date)::int;

  select open_time, close_time into v_bh_open, v_bh_close
  from public.business_hours
  where business_id = v_business.id
    and weekday = v_weekday
    and (location_id is null or location_id = p_location_id)
  order by location_id nulls last
  limit 1;

  if v_bh_open is null then return; end if;

  v_day_start := (p_date::text || ' ' || v_bh_open::text)::timestamp at time zone v_tz;
  v_day_end := (p_date::text || ' ' || v_bh_close::text)::timestamp at time zone v_tz;

  v_slot_duration := make_interval(
    mins => v_service.duration_minutes
          + v_service.buffer_before_minutes
          + v_service.buffer_after_minutes
  );

  return query
  with slots as (
    select generate_series(v_day_start, v_day_end - v_slot_duration, v_step) as slot_start
  )
  select s.slot_start
  from slots s
  where
    s.slot_start >= now() + v_min_notice
    and s.slot_start <= now() + v_max_advance
    -- business closures
    and not exists (
      select 1 from public.business_closures bc
      where bc.business_id = v_business.id
        and (bc.location_id is null or bc.location_id = p_location_id)
        and tstzrange(bc.starts_at, bc.ends_at, '[)')
            && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
    )
    -- existing appointments: same staff OR null-staff (any available)
    and not exists (
      select 1 from public.appointments a
      where a.business_id = v_business.id
        and a.status in ('pending','confirmed')
        and (
          (p_staff_id is not null and a.staff_id = p_staff_id)
          or (p_staff_id is null and a.staff_id is null)
        )
        and tstzrange(a.starts_at, a.ends_at, '[)')
            && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
    )
    -- staff time off
    and (
      p_staff_id is null
      or not exists (
        select 1 from public.staff_time_off sto
        where sto.staff_id = p_staff_id
          and tstzrange(sto.starts_at, sto.ends_at, '[)')
              && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
      )
    )
    -- staff weekly hours
    and (
      p_staff_id is null
      or not exists (
        select 1 from public.staff_hours sh
        where sh.staff_id = p_staff_id and sh.weekday = v_weekday
      )
      or exists (
        select 1 from public.staff_hours sh
        where sh.staff_id = p_staff_id and sh.weekday = v_weekday
          and (s.slot_start at time zone v_tz)::time >= sh.start_time
          and ((s.slot_start + v_slot_duration) at time zone v_tz)::time <= sh.end_time
      )
    )
  order by s.slot_start;
end;
$$;

revoke all on function public.get_availability(citext, uuid, date, uuid, uuid) from public;
grant execute on function public.get_availability(citext, uuid, date, uuid, uuid) to anon, authenticated;