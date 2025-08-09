-- Create branding bucket if not exists
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Public read policy
create policy if not exists "Public read access for branding"
  on storage.objects
  for select
  using (bucket_id = 'branding');

-- Admins can upload
create policy if not exists "Admins can upload branding assets"
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

-- Admins can update
create policy if not exists "Admins can update branding assets"
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

-- Admins can delete
create policy if not exists "Admins can delete branding assets"
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