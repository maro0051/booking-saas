-- 0005_fix_businesses_select.sql
-- Allow a user to SELECT a business they created, even before their
-- business_members row exists. This fixes the insert().select() flow in
-- the onboarding wizard, which reads the row back in the same transaction.

drop policy if exists businesses_select_member on public.businesses;

create policy businesses_select_member on public.businesses
  for select using (
    public.is_business_member(id)
    or public.is_super_admin()
    or created_by = auth.uid()
  );