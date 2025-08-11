-- Create a secure helper to fetch tenant user emails from auth.users
-- This enables the UI to display emails/names for users missing profiles

create or replace function public.get_tenant_user_emails(tenant_id uuid)
returns table (
  user_id uuid,
  email text,
  last_sign_in_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  -- Return emails for users who belong to the specified tenant
  -- Authorization: caller must be a member of the tenant OR an elevated role
  select
    u.id as user_id,
    u.email,
    u.last_sign_in_at,
    u.created_at
  from auth.users u
  join public.tenant_users tu
    on tu.user_id = u.id
  where tu.tenant_id = tenant_id
    and (
      exists (
        select 1
        from public.tenant_users my
        where my.tenant_id = tenant_id
          and my.user_id = auth.uid()
          and my.is_active = true
      )
      or get_current_user_role() in ('superadmin','admin','manager')
    );
$$;

-- Allow authenticated clients to execute
grant execute on function public.get_tenant_user_emails(uuid) to authenticated;