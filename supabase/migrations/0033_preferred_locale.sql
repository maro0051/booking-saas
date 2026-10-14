-- 0033_preferred_locale.sql
-- Persist the user's language preference on their profile.

alter table public.profiles
  add column if not exists preferred_locale text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_locale_check'
  ) then
    alter table public.profiles
      add constraint profiles_locale_check
      check (preferred_locale in ('en','fr'));
  end if;
end $$;

create or replace function public.set_my_locale(p_locale text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_locale not in ('en','fr') then
    raise exception 'invalid locale' using errcode = '22023';
  end if;
  update public.profiles
  set preferred_locale = p_locale
  where id = auth.uid();
end;
$$;

revoke all on function public.set_my_locale(text) from public;
grant execute on function public.set_my_locale(text) to authenticated;