-- Create the walk-in customer for the specific tenant
INSERT INTO public.customers (tenant_id, name, email, phone, address)
VALUES ('d5a3d1be-5ba8-43b0-9625-3638dbcf0fb1', 'Walk-in Customer', 'walkin@customer.local', NULL, NULL);

-- Update all sales with null customer_id to use the walk-in customer
UPDATE public.sales 
SET customer_id = (
  SELECT id FROM public.customers 
  WHERE tenant_id = 'd5a3d1be-5ba8-43b0-9625-3638dbcf0fb1' 
  AND name = 'Walk-in Customer'
)
WHERE customer_id IS NULL 
AND tenant_id = 'd5a3d1be-5ba8-43b0-9625-3638dbcf0fb1';