-- Add default_profit_margin to products table and remove cost_price
ALTER TABLE public.products 
ADD COLUMN default_profit_margin NUMERIC DEFAULT NULL,
DROP COLUMN IF EXISTS cost;

-- Add default_profit_margin to product_variants table and remove purchase_price  
ALTER TABLE public.product_variants
ADD COLUMN default_profit_margin NUMERIC DEFAULT NULL,
DROP COLUMN IF EXISTS purchase_price;