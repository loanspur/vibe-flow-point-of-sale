-- Add new columns to product_variants table for enhanced variant management
ALTER TABLE product_variants 
ADD COLUMN purchase_price NUMERIC DEFAULT 0,
ADD COLUMN sale_price NUMERIC DEFAULT 0,
ADD COLUMN image_url TEXT;