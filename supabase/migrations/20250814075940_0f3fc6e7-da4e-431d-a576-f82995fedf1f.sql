-- Remove the conflicting foreign key constraint that references the old customers table
-- This is causing the "fk_sales_customer" violation error
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS fk_sales_customer;

-- The sales table should only reference contacts table for customer_id
-- The constraint sales_customer_id_fkey already handles this correctly