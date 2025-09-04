CREATE OR REPLACE VIEW public.low_stock_products AS
SELECT id, tenant_id, stock_quantity, min_stock_level
FROM public.products
WHERE stock_quantity < min_stock_level;

ALTER VIEW public.low_stock_products SET (security_invoker = on);
GRANT SELECT ON public.low_stock_products TO anon, authenticated, service_role;

-- Optional: tenant RLS if table has RLS; create policy mirroring products tenant policy.
