-- 0017_public_staff_photo.sql
-- Expose staff.photo_url on the public business payload so customer-facing
-- pages can render staff avatars.

create or replace function public.get_public_business(p_slug citext)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', b.id,
    'slug', b.slug,
    'name', b.name,
    'description', b.description,
    'logo_url', b.logo_url,
    'timezone', b.timezone,
    'currency', b.currency,
    'locale', b.locale,
    'guest_booking_enabled', b.guest_booking_enabled,
    'auto_confirm_bookings', b.auto_confirm_bookings,
    'require_account_to_book', b.require_account_to_book,
    'min_notice_minutes', b.min_notice_minutes,
    'max_advance_days', b.max_advance_days,
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'name', l.name, 'address', l.address, 'phone', l.phone
      ) order by l.name)
      from public.locations l
      where l.business_id = b.id and l.is_active
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'duration_minutes', s.duration_minutes,
        'price_cents', s.price_cents, 'currency', s.currency,
        'deposit_cents', s.deposit_cents
      ) order by s.name)
      from public.services s
      where s.business_id = b.id
        and s.is_active and s.online_booking_enabled
    ), '[]'::jsonb),
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', st.id,
        'display_name', st.display_name,
        'title', st.title,
        'color', st.color,
        'photo_url', st.photo_url,
        'service_ids', (
          select coalesce(jsonb_agg(ss.service_id), '[]'::jsonb)
          from public.staff_services ss where ss.staff_id = st.id
        ),
        'location_ids', (
          select coalesce(jsonb_agg(sl.location_id), '[]'::jsonb)
          from public.staff_locations sl
          where sl.staff_id = st.id
            and sl.location_id in (
              select id from public.locations where business_id = st.business_id
            )
        )
      ) order by st.display_name)
      from public.staff st
      where st.business_id = b.id and st.is_active
    ), '[]'::jsonb)
  )
  from public.businesses b
  where b.slug = p_slug and b.status = 'active';
$$;

revoke all on function public.get_public_business(citext) from public;
grant execute on function public.get_public_business(citext) to anon, authenticated;