create or replace function public.set_tenant_id_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  if NEW.tenant_id is not null then
    return NEW;
  end if;

  select tenant_id into v_tenant
  from public.profiles
  where user_id = auth.uid()
  limit 1;

  NEW.tenant_id := v_tenant;
  return NEW;
end;
$$;

-- Attach to tables that require tenant_id
drop trigger if exists trg_set_tenant_products on public.products;
create trigger trg_set_tenant_products
before insert on public.products
for each row execute function public.set_tenant_id_from_profile();

drop trigger if exists trg_set_tenant_brands on public.brands;
create trigger trg_set_tenant_brands
before insert on public.brands
for each row execute function public.set_tenant_id_from_profile();

drop trigger if exists trg_set_tenant_units on public.product_units;
create trigger trg_set_tenant_units
before insert on public.product_units
for each row execute function public.set_tenant_id_from_profile();
