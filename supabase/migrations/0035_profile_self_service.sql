-- 0035_profile_self_service.sql
-- Allows any signed-in user to update their own profile fields.

create or replace function public.update_my_profile(
  p_full_name text default null,
  p_phone text default null,
  p_preferred_locale text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_preferred_locale is not null and p_preferred_locale not in ('en','fr') then
    raise exception 'invalid locale' using errcode = '22023';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    preferred_locale = coalesce(p_preferred_locale, preferred_locale),
    updated_at = now()
  where id = auth.uid()
  returning * into v_row;

  if v_row is null then
    raise exception 'profile not found' using errcode = '22023';
  end if;

  return v_row;
end;
$$;

revoke all on function public.update_my_profile(text, text, text) from public;
grant execute on function public.update_my_profile(text, text, text) to authenticated;

-- Also: a safe getter that returns the current user's full profile row.
create or replace function public.get_my_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;