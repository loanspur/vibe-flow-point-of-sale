alter table public.brands enable row level security;

drop policy if exists brands_select on public.brands;
create policy brands_select on public.brands
for select to authenticated
using (
  public.user_is_superadmin()
  or public.user_belongs_to_tenant(tenant_id)
);

drop policy if exists brands_insert on public.brands;
create policy brands_insert on public.brands
for insert to authenticated
with check (
  public.user_is_superadmin()
  or public.user_belongs_to_tenant(tenant_id)
);

drop policy if exists brands_update on public.brands;
create policy brands_update on public.brands
for update to authenticated
using (
  public.user_is_superadmin()
  or public.user_belongs_to_tenant(tenant_id)
)
with check (
  public.user_is_superadmin()
  or public.user_belongs_to_tenant(tenant_id)
);

drop policy if exists brands_delete on public.brands;
create policy brands_delete on public.brands
for delete to authenticated
using (
  public.user_is_superadmin()
  or public.user_belongs_to_tenant(tenant_id)
);
