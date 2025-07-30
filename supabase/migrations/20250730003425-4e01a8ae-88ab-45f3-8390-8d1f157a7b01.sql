-- Fix sales table foreign key constraint for customer_id
-- The error suggests customer_id foreign key is pointing to wrong table

-- First, check current foreign key constraints and drop if needed
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
-- Since the SaleForm fetches customers from contacts table with type='customer'
ALTER TABLE public.sales 
ADD CONSTRAINT sales_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.contacts(id) 
ON DELETE SET NULL;

-- Also ensure tenant_id has proper foreign key if missing
DO $$ 
BEGIN
    -- Add tenant_id foreign key if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_tenant_id_fkey' 
        AND table_name = 'sales'
    ) THEN
        ALTER TABLE public.sales 
        ADD CONSTRAINT sales_tenant_id_fkey 
        FOREIGN KEY (tenant_id) 
        REFERENCES public.tenants(id) 
        ON DELETE CASCADE;
    END IF;
END $$;