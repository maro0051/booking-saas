-- 0016_storage_and_staff_photo.sql
-- Adds staff.photo_url, creates two public Storage buckets, and installs
-- RLS policies that keep uploads scoped to the caller's business.

-- =========================================================
-- staff.photo_url
-- =========================================================

alter table public.staff
  add column if not exists photo_url text;

-- =========================================================
-- Storage buckets
-- =========================================================
-- Storage tables live in the `storage` schema. We insert rows directly
-- (the CLI doesn't expose a dedicated "create bucket" command).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('business-logos', 'business-logos', true, 5242880,
   array['image/png','image/jpeg','image/webp','image/svg+xml']::text[]),
  ('staff-photos', 'staff-photos', true, 5242880,
   array['image/png','image/jpeg','image/webp']::text[])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =========================================================
-- RLS: storage.objects
-- =========================================================
-- Public read for anything under the two buckets (they are public anyway,
-- but the RLS policy below also allows authenticated & anon SELECT).
-- Writes are scoped: the caller must be a business member/owner of the
-- business whose id is the first folder segment.

-- Drop previous policies if re-run
drop policy if exists "public read business-logos" on storage.objects;
drop policy if exists "public read staff-photos" on storage.objects;
drop policy if exists "member insert business-logos" on storage.objects;
drop policy if exists "member update business-logos" on storage.objects;
drop policy if exists "owner delete business-logos" on storage.objects;
drop policy if exists "member insert staff-photos" on storage.objects;
drop policy if exists "member update staff-photos" on storage.objects;
drop policy if exists "owner delete staff-photos" on storage.objects;

-- Read
create policy "public read business-logos"
  on storage.objects for select
  using (bucket_id = 'business-logos');

create policy "public read staff-photos"
  on storage.objects for select
  using (bucket_id = 'staff-photos');

-- Insert: business member for that business, folder = business_id
create policy "member insert business-logos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and public.is_business_member((storage.foldername(name))[1]::uuid)
  );

create policy "member insert staff-photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'staff-photos'
    and public.is_business_member((storage.foldername(name))[1]::uuid)
  );

-- Update: same rule (owner or member of that business)
create policy "member update business-logos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-logos'
    and public.is_business_member((storage.foldername(name))[1]::uuid)
  );

create policy "member update staff-photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'staff-photos'
    and public.is_business_member((storage.foldername(name))[1]::uuid)
  );

-- Delete: owners only
create policy "owner delete business-logos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-logos'
    and public.is_business_owner((storage.foldername(name))[1]::uuid)
  );

create policy "owner delete staff-photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'staff-photos'
    and public.is_business_owner((storage.foldername(name))[1]::uuid)
  );