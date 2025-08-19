-- Add missing min_stock_level column to product_variants table
ALTER TABLE public.product_variants 
ADD COLUMN min_stock_level integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.product_variants.min_stock_level IS 'Minimum stock level threshold for low stock alerts on this variant';