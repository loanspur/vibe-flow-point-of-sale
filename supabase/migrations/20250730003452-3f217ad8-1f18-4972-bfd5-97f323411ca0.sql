-- Fix sales table foreign key constraint by cleaning up orphaned data first

-- First, set customer_id to NULL for sales that reference non-existent contacts
UPDATE public.sales 
SET customer_id = NULL 
WHERE customer_id IS NOT NULL 
AND customer_id NOT IN (
    SELECT id FROM public.contacts WHERE id IS NOT NULL
);

-- Now drop and recreate the foreign key constraint properly
DO $$ 
BEGIN
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_customer_id_fkey' 
        AND table_name = 'sales'
    ) THEN
        ALTER TABLE public.sales DROP CONSTRAINT sales_customer_id_fkey;
    END IF;
END $$;

-- Add proper foreign key constraint to reference contacts table
ALTER TABLE public.sales 
ADD CONSTRAINT sales_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.contacts(id) 
ON DELETE SET NULL;