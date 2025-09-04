-- Create a read-only view PostgREST can select from
create or replace view public.low_stock_products as
select id, tenant_id, stock_quantity, min_stock_level
from public.products
where stock_quantity < min_stock_level;

-- Ensure the view is selectable via PostgREST
alter view public.low_stock_products set (security_invoker = on);
grant select on public.low_stock_products to anon, authenticated, service_role;
