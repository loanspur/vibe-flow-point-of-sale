-- add columns if they don't exist
alter table public.products
  add column if not exists retail_price numeric(18,2),
  add column if not exists wholesale_price numeric(18,2);

-- helper (already may exist)
create or replace function public.user_belongs_to_tenant(target_tenant uuid)
returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.tenant_id=target_tenant);
$$;

create or replace function public.user_is_superadmin()
returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.profiles p where p.user_id=auth.uid()
        and p.role in ('superadmin','admin'));
$$;

-- RLS (ensure enabled and scoped)
alter table public.products enable row level security;

drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated
with check (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists products_update on public.products;
create policy products_update on public.products for update to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id))
with check (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete to authenticated
using (public.user_is_superadmin() or public.user_belongs_to_tenant(tenant_id));

-- auto-tenant trigger (optional but helpful)
create or replace function public.set_tenant_id_from_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_tenant uuid;
begin
  if NEW.tenant_id is not null then return NEW; end if;
  select tenant_id into v_tenant from public.profiles where user_id = auth.uid() limit 1;
  NEW.tenant_id := v_tenant;
  return NEW;
end; $$;

drop trigger if exists trg_set_tenant_products on public.products;
create trigger trg_set_tenant_products
before insert on public.products
for each row execute function public.set_tenant_id_from_profile();

-- low stock view (for Stock tab) - drop and recreate to avoid column conflicts
drop view if exists public.low_stock_products;

create view public.low_stock_products as
select 
  p.id,
  p.name,
  p.sku,
  p.stock_quantity,
  p.min_stock_level,
  p.tenant_id
from public.products p
where p.stock_quantity is not null
  and p.min_stock_level is not null
  and p.stock_quantity < p.min_stock_level;

grant select on public.low_stock_products to authenticated;
