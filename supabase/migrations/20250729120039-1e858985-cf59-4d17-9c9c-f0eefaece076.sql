-- Add sale_type column to sales table to distinguish between online and in-store sales
ALTER TABLE public.sales 
ADD COLUMN sale_type text NOT NULL DEFAULT 'in_store';

-- Add check constraint to ensure only valid sale types
ALTER TABLE public.sales 
ADD CONSTRAINT sales_sale_type_check 
CHECK (sale_type IN ('in_store', 'online'));