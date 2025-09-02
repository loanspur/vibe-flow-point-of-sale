alter table public.products enable row level security;
alter table public.product_units enable row level security;

-- PRODUCTS
drop policy if exists products_select on public.products;
create policy products_select on public.products
for select to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
for insert to authenticated
with check (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists products_update on public.products;
create policy products_update on public.products
for update to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id))
with check (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
for delete to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

-- UNITS
drop policy if exists units_select on public.product_units;
create policy units_select on public.product_units
for select to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists units_insert on public.product_units;
create policy units_insert on public.product_units
for insert to authenticated
with check (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists units_update on public.product_units;
create policy units_update on public.product_units
for update to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id))
with check (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists units_delete on public.product_units;
create policy units_delete on public.product_units
for delete to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));
