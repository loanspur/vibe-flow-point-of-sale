-- Create low stock products view
CREATE OR REPLACE VIEW public.low_stock_products AS
SELECT 
    id, 
    tenant_id, 
    stock_quantity, 
    min_stock_level,
    name,
    sku
FROM public.products
WHERE stock_quantity < min_stock_level;

-- Set security invoker
ALTER VIEW public.low_stock_products SET (security_invoker = on);

-- Grant permissions
GRANT SELECT ON public.low_stock_products TO anon, authenticated, service_role;

-- Add RLS policy if needed (mirror products table policy)
COMMENT ON VIEW public.low_stock_products IS 'View for products with stock below minimum threshold';
