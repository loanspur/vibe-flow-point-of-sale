-- Get all sales with null customer_id and their tenant_id
-- Then update them with a walk-in customer (create if needed)

-- First ensure we have walk-in customers for all tenants with null customer sales
INSERT INTO public.customers (tenant_id, name, email, phone, address)
SELECT DISTINCT 
  s.tenant_id,
  'Walk-in Customer',
  'walkin-' || s.tenant_id || '@customer.local',
  NULL,
  NULL
FROM public.sales s
WHERE s.customer_id IS NULL
ON CONFLICT (email) DO NOTHING;

-- Now update all sales with null customer_id
UPDATE public.sales 
SET customer_id = (
  SELECT c.id 
  FROM public.customers c
  WHERE c.tenant_id = sales.tenant_id 
  AND c.name = 'Walk-in Customer'
  LIMIT 1
)
WHERE customer_id IS NULL;