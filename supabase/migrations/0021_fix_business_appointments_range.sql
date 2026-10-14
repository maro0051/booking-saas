-- 0021_fix_business_appointments_range.sql
-- Rewrite business_appointments_range with explicit casts so column types
-- in the SELECT match the RETURNS TABLE declaration exactly.

create or replace function public.business_appointments_range(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_staff_id uuid default null,
  p_location_id uuid default null,
  p_service_id uuid default null,
  p_status text default null
)
returns table (
  id uuid,
  reference text,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  service_id uuid,
  service_name text,
  staff_id uuid,
  staff_name text,
  staff_color text,
  location_id uuid,
  location_name text,
  customer_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  price_cents int,
  currency text,
  notes text,
  internal_notes text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_business_member(p_business_id) and not public.is_super_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    a.id::uuid,
    a.reference::text,
    a.status::text,
    a.starts_at::timestamptz,
    a.ends_at::timestamptz,
    s.id::uuid,
    s.name::text,
    st.id::uuid,
    st.display_name::text,
    st.color::text,
    l.id::uuid,
    l.name::text,
    c.id::uuid,
    c.full_name::text,
    c.email::text,
    c.phone::text,
    a.price_cents::int,
    a.currency::text,
    a.notes::text,
    a.internal_notes::text
  from public.appointments a
  join public.services s on s.id = a.service_id
  join public.customers c on c.id = a.customer_id
  left join public.staff st on st.id = a.staff_id
  left join public.locations l on l.id = a.location_id
  where a.business_id = p_business_id
    and a.starts_at < p_to
    and a.ends_at > p_from
    and (p_staff_id is null or a.staff_id = p_staff_id)
    and (p_location_id is null or a.location_id = p_location_id)
    and (p_service_id is null or a.service_id = p_service_id)
    and (p_status is null or a.status = p_status)
  order by a.starts_at;
end;
$$;

revoke all on function public.business_appointments_range(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text) from public;
grant execute on function public.business_appointments_range(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text) to authenticated;