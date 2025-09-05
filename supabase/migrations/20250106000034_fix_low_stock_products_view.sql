-- Fix low_stock_products view to include tenant_id for proper filtering
-- The current view is missing tenant_id which causes 400 errors when filtering

-- Drop the existing view
DROP VIEW IF EXISTS public.low_stock_products CASCADE;

-- Recreate the view with tenant_id included
CREATE OR REPLACE VIEW public.low_stock_products AS
SELECT 
    p.id,
    p.tenant_id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.min_stock_level,
    p.category_id,
    pc.name as category_name,
    CASE 
        WHEN p.stock_quantity <= 0 THEN 'Out of Stock'
        WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status
FROM public.products p
LEFT JOIN public.product_categories pc ON p.category_id = pc.id
WHERE p.is_active = true
AND (p.stock_quantity <= p.min_stock_level OR p.stock_quantity <= 0);

-- Add comment for documentation
COMMENT ON VIEW public.low_stock_products IS 'View showing products with low stock levels, includes tenant_id for proper filtering';

-- Also fix the out_of_stock_products view to include tenant_id
DROP VIEW IF EXISTS public.out_of_stock_products CASCADE;

CREATE OR REPLACE VIEW public.out_of_stock_products AS
SELECT 
    p.id,
    p.tenant_id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.min_stock_level,
    p.category_id,
    pc.name as category_name
FROM public.products p
LEFT JOIN public.product_categories pc ON p.category_id = pc.id
WHERE p.is_active = true
AND p.stock_quantity <= 0;

-- Add comment for documentation
COMMENT ON VIEW public.out_of_stock_products IS 'View showing products that are out of stock, includes tenant_id for proper filtering';

-- Also fix the inventory_overview view to include tenant_id
DROP VIEW IF EXISTS public.inventory_overview CASCADE;

CREATE OR REPLACE VIEW public.inventory_overview AS
SELECT 
    p.id,
    p.tenant_id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.min_stock_level,
    p.cost_price,
    p.retail_price,
    p.wholesale_price,
    pc.name as category_name,
    CASE 
        WHEN p.stock_quantity <= 0 THEN 'Out of Stock'
        WHEN p.stock_quantity <= p.min_stock_level THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status,
    (p.stock_quantity * p.cost_price) as inventory_value
FROM public.products p
LEFT JOIN public.product_categories pc ON p.category_id = pc.id
WHERE p.is_active = true;

-- Add comment for documentation
COMMENT ON VIEW public.inventory_overview IS 'Comprehensive inventory overview with stock status and values, includes tenant_id for proper filtering';
