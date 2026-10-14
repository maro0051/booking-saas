-- 0018_booking_reference_staff_photo.sql
-- Add photo_url and title to staff payload on get_booking_by_reference.

create or replace function public.get_booking_by_reference(
  p_slug citext,
  p_reference text
)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'reference', a.reference,
    'status', a.status,
    'starts_at', a.starts_at,
    'ends_at', a.ends_at,
    'price_cents', a.price_cents,
    'currency', a.currency,
    'notes', a.notes,
    'business', jsonb_build_object(
      'slug', b.slug, 'name', b.name,
      'timezone', b.timezone,
      'contact_email', b.contact_email, 'contact_phone', b.contact_phone
    ),
    'service', jsonb_build_object(
      'id', s.id, 'name', s.name,
      'duration_minutes', s.duration_minutes
    ),
    'staff', case when st.id is null then null else
      jsonb_build_object(
        'id', st.id,
        'display_name', st.display_name,
        'title', st.title,
        'color', st.color,
        'photo_url', st.photo_url
      )
    end,
    'location', case when l.id is null then null else
      jsonb_build_object('id', l.id, 'name', l.name, 'address', l.address)
    end,
    'customer', jsonb_build_object(
      'full_name', c.full_name,
      'email_masked', case
        when c.email is null then null
        else substr(c.email::text, 1, 2) || '***@' ||
             split_part(c.email::text, '@', 2)
      end
    )
  )
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  join public.services s on s.id = a.service_id
  join public.customers c on c.id = a.customer_id
  left join public.staff st on st.id = a.staff_id
  left join public.locations l on l.id = a.location_id
  where b.slug = p_slug and a.reference = p_reference;
$$;

revoke all on function public.get_booking_by_reference(citext, text) from public;
grant execute on function public.get_booking_by_reference(citext, text) to anon, authenticated;