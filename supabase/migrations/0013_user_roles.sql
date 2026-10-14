-- 0013_user_roles.sql
-- A single RPC that returns the roles the current user holds. Used by the
-- client to route users to their correct portal and to reject wrong-portal
-- logins. Returns only booleans about the caller; nothing about other users.

create or replace function public.my_roles()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object(
      'authenticated', false,
      'is_admin', false,
      'is_business_member', false,
      'is_customer', false
    );
  end if;

  return jsonb_build_object(
    'authenticated', true,
    'is_admin', exists (select 1 from public.admin_users where user_id = v_uid),
    'is_business_member', exists (
      select 1 from public.business_members
      where user_id = v_uid and status = 'active'
    ),
    'is_customer', exists (
      select 1 from public.customers where user_id = v_uid
    )
  );
end;
$$;

revoke all on function public.my_roles() from public;
grant execute on function public.my_roles() to authenticated, anon;