-- First, let's create a default customer for any existing sales without customer_id
INSERT INTO public.customers (tenant_id, name, email, phone, address)
VALUES 
  ('d5a3d1be-5ba8-43b0-9625-3638dbcf0fb1', 'Walk-in Customer', 'walkin@customer.local', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Update any existing sales that have null customer_id to use the walk-in customer
UPDATE public.sales 
SET customer_id = (
  SELECT id FROM public.customers 
  WHERE tenant_id = sales.tenant_id 
  AND name = 'Walk-in Customer' 
  LIMIT 1
)
WHERE customer_id IS NULL;

-- Now make customer_id NOT NULL in the sales table
ALTER TABLE public.sales 
ALTER COLUMN customer_id SET NOT NULL;

-- Add a foreign key constraint to ensure data integrity
ALTER TABLE public.sales 
ADD CONSTRAINT fk_sales_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id);

-- Create a function to automatically create walk-in customer if needed
CREATE OR REPLACE FUNCTION public.ensure_customer_exists(tenant_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_id uuid;
BEGIN
  -- Try to find existing walk-in customer
  SELECT id INTO customer_id
  FROM public.customers
  WHERE tenant_id = tenant_id_param 
  AND name = 'Walk-in Customer'
  LIMIT 1;
  
  -- If not found, create one
  IF customer_id IS NULL THEN
    INSERT INTO public.customers (tenant_id, name, email, phone, address)
    VALUES (tenant_id_param, 'Walk-in Customer', 'walkin@customer.local', NULL, NULL)
    RETURNING id INTO customer_id;
  END IF;
  
  RETURN customer_id;
END;
$$;