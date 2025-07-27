-- Step 3: Now make customer_id NOT NULL since we've fixed all null values
ALTER TABLE public.sales 
ALTER COLUMN customer_id SET NOT NULL;

-- Step 4: Add a foreign key constraint to ensure data integrity
ALTER TABLE public.sales 
ADD CONSTRAINT fk_sales_customer 
FOREIGN KEY (customer_id) REFERENCES public.customers(id);

-- Step 5: Create a function to automatically create walk-in customer if needed
CREATE OR REPLACE FUNCTION public.ensure_customer_exists(tenant_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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