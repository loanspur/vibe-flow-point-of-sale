create or replace function public.user_belongs_to_tenant(target_tenant uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where user_id = auth.uid() and tenant_id = target_tenant
  );
$$;

-- For convenience, allow superadmin to bypass (if you store roles in profiles.role)
create or replace function public.user_is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('superadmin','admin')
  );
$$;
