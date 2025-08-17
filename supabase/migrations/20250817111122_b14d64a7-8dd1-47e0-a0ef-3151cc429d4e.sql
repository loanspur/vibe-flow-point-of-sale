-- Add missing customer_name and notes columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing sales to populate customer_name from contacts
UPDATE public.sales 
SET customer_name = c.name 
FROM public.contacts c 
WHERE sales.customer_id = c.id 
AND sales.customer_name IS NULL;