-- Add cost_price column to products table
ALTER TABLE public.products 
ADD COLUMN cost_price NUMERIC(10,2) DEFAULT 0;