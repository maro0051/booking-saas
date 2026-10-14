-- 0006_create_business_rpc.sql
-- Atomic business creation with owner membership, bypassing RLS safely
-- inside a security-definer function that performs its own validation.

create or replace function public.create_business_with_owner(
  p_slug citext,
  p_name text,
  p_description text,
  p_contact_email citext,
  p_contact_phone text,
  p_timezone text,
  p_currency text,
  p_locale text
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business public.businesses;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_slug is null or length(p_slug) < 2 then
    raise exception 'invalid slug' using errcode = '22023';
  end if;

  if exists (select 1 from public.businesses where slug = p_slug) then
    raise exception 'slug already taken' using errcode = '23505';
  end if;

  insert into public.businesses (
    slug, name, description, contact_email, contact_phone,
    timezone, currency, locale, status, onboarding_completed, created_by
  ) values (
    p_slug, p_name,
    nullif(p_description, ''),
    nullif(p_contact_email, ''),
    nullif(p_contact_phone, ''),
    p_timezone, p_currency, p_locale,
    'active', true, v_uid
  )
  returning * into v_business;

  insert into public.business_members (business_id, user_id, role, status)
  values (v_business.id, v_uid, 'owner', 'active');

  insert into public.audit_logs (actor_user_id, actor_role, business_id, action, target_table, target_id, metadata)
  values (v_uid, 'business_owner', v_business.id, 'business.create', 'businesses', v_business.id::text,
          jsonb_build_object('slug', p_slug, 'name', p_name));

  return v_business;
end;
$$;

revoke all on function public.create_business_with_owner(
  citext, text, text, citext, text, text, text, text
) from public;

grant execute on function public.create_business_with_owner(
  citext, text, text, citext, text, text, text, text
) to authenticated;