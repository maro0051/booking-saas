-- 0019_availability_no_preference.sql
-- New RPC: availability across ANY eligible staff for a given service.
-- Returns a slot if at least one active staff member assigned to the
-- service is free at that time. Falls back to null-staff behaviour when
-- the business has no staff assigned to the service.

create or replace function public.get_availability_any_staff(
  p_slug citext,
  p_service_id uuid,
  p_date date,
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
  v_has_staff boolean;
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

  -- Do we have at least one active staff member for this service?
  select exists (
    select 1
    from public.staff s
    join public.staff_services ss on ss.staff_id = s.id
    where s.business_id = v_business.id
      and s.is_active = true
      and ss.service_id = v_service.id
  ) into v_has_staff;

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
    and (
      case
        when v_has_staff then
          -- At least one assigned staff member is free at that time
          exists (
            select 1
            from public.staff st
            join public.staff_services ss on ss.staff_id = st.id
            where st.business_id = v_business.id
              and st.is_active
              and ss.service_id = v_service.id
              -- no conflicting appointment
              and not exists (
                select 1 from public.appointments a
                where a.staff_id = st.id
                  and a.status in ('pending','confirmed')
                  and tstzrange(a.starts_at, a.ends_at, '[)')
                      && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
              )
              -- no time off
              and not exists (
                select 1 from public.staff_time_off sto
                where sto.staff_id = st.id
                  and tstzrange(sto.starts_at, sto.ends_at, '[)')
                      && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
              )
              -- respects staff weekly hours (if any are defined for that weekday)
              and (
                not exists (
                  select 1 from public.staff_hours sh
                  where sh.staff_id = st.id and sh.weekday = v_weekday
                )
                or exists (
                  select 1 from public.staff_hours sh
                  where sh.staff_id = st.id and sh.weekday = v_weekday
                    and (s.slot_start at time zone v_tz)::time >= sh.start_time
                    and ((s.slot_start + v_slot_duration) at time zone v_tz)::time <= sh.end_time
                )
              )
          )
        else
          -- Fallback: no staff assigned, treat as null-staff business
          not exists (
            select 1 from public.appointments a
            where a.business_id = v_business.id
              and a.staff_id is null
              and a.status in ('pending','confirmed')
              and tstzrange(a.starts_at, a.ends_at, '[)')
                  && tstzrange(s.slot_start, s.slot_start + v_slot_duration, '[)')
          )
      end
    )
  order by s.slot_start;
end;
$$;

revoke all on function public.get_availability_any_staff(citext, uuid, date, uuid) from public;
grant execute on function public.get_availability_any_staff(citext, uuid, date, uuid) to anon, authenticated;