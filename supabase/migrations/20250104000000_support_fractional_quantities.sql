-- Migration to support fractional quantities in inventory and sales
-- This migration changes INTEGER fields to NUMERIC to support decimal quantities

-- First, we need to drop views and rules that depend on the columns we're changing
-- Drop views that depend on stock_quantity
DROP VIEW IF EXISTS public.low_stock_products CASCADE;
DROP VIEW IF EXISTS public.out_of_stock_products CASCADE;
DROP VIEW IF EXISTS public.stock_summary CASCADE;
DROP VIEW IF EXISTS public.inventory_overview CASCADE;

-- Drop any rules that depend on these columns
DROP RULE IF EXISTS _RETURN ON public.low_stock_products CASCADE;

-- 1. Update sale_items table to support fractional quantities
ALTER TABLE public.sale_items 
ALTER COLUMN quantity TYPE NUMERIC(10,3);

-- 2. Update products table to support fractional stock quantities
ALTER TABLE public.products 
ALTER COLUMN stock_quantity TYPE NUMERIC(10,3),
ALTER COLUMN min_stock_level TYPE NUMERIC(10,3);

-- 3. Update product_variants table to support fractional stock quantities
ALTER TABLE public.product_variants 
ALTER COLUMN stock_quantity TYPE NUMERIC(10,3);

-- 4. Update inventory_transactions table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_transactions') THEN
        ALTER TABLE public.inventory_transactions 
        ALTER COLUMN quantity TYPE NUMERIC(10,3);
    END IF;
END $$;

-- 5. Update stock_adjustment_items table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_adjustment_items') THEN
        ALTER TABLE public.stock_adjustment_items 
        ALTER COLUMN system_quantity TYPE NUMERIC(10,3),
        ALTER COLUMN physical_quantity TYPE NUMERIC(10,3),
        ALTER COLUMN adjustment_quantity TYPE NUMERIC(10,3);
    END IF;
END $$;

-- 6. Update stock_transfer_items table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfer_items') THEN
        ALTER TABLE public.stock_transfer_items 
        ALTER COLUMN quantity_requested TYPE NUMERIC(10,3),
        ALTER COLUMN quantity_shipped TYPE NUMERIC(10,3),
        ALTER COLUMN quantity_received TYPE NUMERIC(10,3);
    END IF;
END $$;

-- 7. Update database functions to support fractional quantities

-- Update update_product_stock function
CREATE OR REPLACE FUNCTION public.update_product_stock(product_id uuid, quantity_sold numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE public.products 
    SET stock_quantity = GREATEST(0, stock_quantity - quantity_sold)
    WHERE id = product_id;
END;
$$;

-- Update update_variant_stock function
CREATE OR REPLACE FUNCTION public.update_variant_stock(variant_id uuid, quantity_sold numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    UPDATE public.product_variants 
    SET stock_quantity = GREATEST(0, stock_quantity - quantity_sold)
    WHERE id = variant_id;
END;
$$;

-- Update calculate_promotion_discount function
CREATE OR REPLACE FUNCTION public.calculate_promotion_discount(
    promotion_id_param uuid, 
    item_price_param numeric, 
    item_quantity_param numeric DEFAULT 1, 
    total_amount_param numeric DEFAULT 0
)
RETURNS TABLE(discount_amount numeric, affected_quantity numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    promotion_record RECORD;
    calculated_discount numeric := 0;
    affected_qty numeric := 0;
BEGIN
    -- Get promotion details
    SELECT * INTO promotion_record 
    FROM public.promotions 
    WHERE id = promotion_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Calculate discount based on promotion type
    CASE promotion_record.discount_type
        WHEN 'percentage' THEN
            calculated_discount := (item_price_param * item_quantity_param) * (promotion_record.discount_value / 100);
            affected_qty := item_quantity_param;
        WHEN 'fixed_amount' THEN
            calculated_discount := promotion_record.discount_value;
            affected_qty := item_quantity_param;
        WHEN 'buy_x_get_y' THEN
            -- Implement buy X get Y logic
            affected_qty := FLOOR(item_quantity_param / promotion_record.min_quantity) * promotion_record.free_quantity;
            calculated_discount := affected_qty * item_price_param;
        ELSE
            calculated_discount := 0;
            affected_qty := 0;
    END CASE;
    
    -- Return the calculated values
    discount_amount := calculated_discount;
    affected_quantity := affected_qty;
    
    RETURN NEXT;
END;
$$;

-- Recreate views that were dropped (with updated column types)
-- Recreate low_stock_products view
CREATE OR REPLACE VIEW public.low_stock_products AS
SELECT 
    p.id,
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

-- Recreate out_of_stock_products view
CREATE OR REPLACE VIEW public.out_of_stock_products AS
SELECT 
    p.id,
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

-- Recreate stock_summary view
CREATE OR REPLACE VIEW public.stock_summary AS
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as in_stock_products,
    COUNT(CASE WHEN stock_quantity <= 0 THEN 1 END) as out_of_stock_products,
    COUNT(CASE WHEN stock_quantity <= min_stock_level AND stock_quantity > 0 THEN 1 END) as low_stock_products,
    SUM(stock_quantity) as total_stock_value
FROM public.products
WHERE is_active = true;

-- Recreate inventory_overview view
CREATE OR REPLACE VIEW public.inventory_overview AS
SELECT 
    p.id,
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

-- Add comments for documentation
COMMENT ON COLUMN public.sale_items.quantity IS 'Quantity of items sold - supports fractional quantities (e.g., 1.5, 2.25)';
COMMENT ON COLUMN public.products.stock_quantity IS 'Current stock quantity - supports fractional quantities (e.g., 1.5, 2.25)';
COMMENT ON COLUMN public.products.min_stock_level IS 'Minimum stock level - supports fractional quantities (e.g., 1.5, 2.25)';
COMMENT ON COLUMN public.product_variants.stock_quantity IS 'Variant stock quantity - supports fractional quantities (e.g., 1.5, 2.25)';

-- Add comments for stock adjustment and transfer tables (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_adjustment_items') THEN
        COMMENT ON COLUMN public.stock_adjustment_items.system_quantity IS 'System recorded quantity - supports fractional quantities (e.g., 1.5, 2.25)';
        COMMENT ON COLUMN public.stock_adjustment_items.physical_quantity IS 'Physically counted quantity - supports fractional quantities (e.g., 1.5, 2.25)';
        COMMENT ON COLUMN public.stock_adjustment_items.adjustment_quantity IS 'Adjustment quantity (physical - system) - supports fractional quantities (e.g., 1.5, 2.25)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfer_items') THEN
        COMMENT ON COLUMN public.stock_transfer_items.quantity_requested IS 'Requested transfer quantity - supports fractional quantities (e.g., 1.5, 2.25)';
        COMMENT ON COLUMN public.stock_transfer_items.quantity_shipped IS 'Shipped quantity - supports fractional quantities (e.g., 1.5, 2.25)';
        COMMENT ON COLUMN public.stock_transfer_items.quantity_received IS 'Received quantity - supports fractional quantities (e.g., 1.5, 2.25)';
    END IF;
END $$;
