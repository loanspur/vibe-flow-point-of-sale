-- Step 1: First, let's create a default customer for any existing sales without customer_id
INSERT INTO public.customers (tenant_id, name, email, phone, address)
SELECT DISTINCT tenant_id, 'Walk-in Customer', 'walkin@customer.local', NULL, NULL
FROM public.sales 
WHERE customer_id IS NULL
ON CONFLICT DO NOTHING;

-- Step 2: Update any existing sales that have null customer_id to use the walk-in customer
UPDATE public.sales 
SET customer_id = (
  SELECT c.id 
  FROM public.customers c
  WHERE c.tenant_id = sales.tenant_id 
  AND c.name = 'Walk-in Customer' 
  LIMIT 1
)
WHERE customer_id IS NULL;