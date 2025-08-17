-- Fix the foreign key constraint issue for quotes table
-- The quotes table should reference contacts table, not customers table

-- First, drop the existing foreign key constraint if it exists
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotes_customer_id_fkey' 
        AND table_name = 'quotes'
    ) THEN
        ALTER TABLE quotes DROP CONSTRAINT quotes_customer_id_fkey;
    END IF;
END $$;

-- Add the correct foreign key constraint to reference contacts table
ALTER TABLE quotes 
ADD CONSTRAINT quotes_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES contacts(id) 
ON DELETE SET NULL;

-- Also ensure that when customer_id is null, quotes can still be created
-- Make customer_id nullable in quotes table if not already
ALTER TABLE quotes ALTER COLUMN customer_id DROP NOT NULL;