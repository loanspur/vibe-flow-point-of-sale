-- Create branding bucket if not exists
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (usually enabled by default)
alter table storage.objects enable row level security;

-- Drop existing policies for a clean setup (optional safety)
-- Note: Only drop policies if they already exist
drop policy if exists "Public read access for branding" on storage.objects;
drop policy if exists "Admins can upload branding assets" on storage.objects;
drop policy if exists "Admins can update branding assets" on storage.objects;
drop policy if exists "Admins can delete branding assets" on storage.objects;

authentication
-- Public read access to branding bucket objects
create policy "Public read access for branding"
  on storage.objects
  for select
  using (bucket_id = 'branding');

-- Allow admins/superadmins to upload (INSERT) to branding bucket
create policy "Admins can upload branding assets"
  on storage.objects
  for insert
  with check (
    bucket_id = 'branding'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin','superadmin')
    )
    and (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

-- Allow admins/superadmins to update (UPDATE) their tenant branding assets
create policy "Admins can update branding assets"
  on storage.objects
  for update
  using (
    bucket_id = 'branding'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin','superadmin')
    )
    and (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  )
  with check (
    bucket_id = 'branding'
    and (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );

-- Allow admins/superadmins to delete (DELETE) their tenant branding assets
create policy "Admins can delete branding assets"
  on storage.objects
  for delete
  using (
    bucket_id = 'branding'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.role in ('admin','superadmin')
    )
    and (storage.foldername(name))[1] = public.get_user_tenant_id()::text
  );