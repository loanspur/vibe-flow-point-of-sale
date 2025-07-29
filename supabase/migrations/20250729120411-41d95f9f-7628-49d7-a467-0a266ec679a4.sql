-- Add missing columns to sales table
ALTER TABLE public.sales 
ADD COLUMN shipping_amount numeric NOT NULL DEFAULT 0;

-- Add missing columns to purchases table  
ALTER TABLE public.purchases 
ADD COLUMN shipping_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN tax_amount numeric NOT NULL DEFAULT 0,
ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

-- Update sales table to allow nullable customer_id for walk-in customers
ALTER TABLE public.sales 
ALTER COLUMN customer_id DROP NOT NULL;

-- Update purchases table to allow nullable fields that might not always be required
ALTER TABLE public.purchases 
ALTER COLUMN supplier_id DROP NOT NULL;