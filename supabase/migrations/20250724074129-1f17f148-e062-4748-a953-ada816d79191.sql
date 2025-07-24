-- Assign default billing plans to existing tenants that don't have subscriptions
INSERT INTO public.tenant_subscriptions (
  tenant_id, 
  billing_plan_id, 
  reference, 
  status, 
  amount, 
  currency, 
  started_at, 
  expires_at
)
SELECT 
  t.id as tenant_id,
  bp.id as billing_plan_id,
  'default-' || t.id as reference,
  'active' as status,
  500 as amount,
  'NGN' as currency,
  now() as started_at,
  (now() + interval '30 days') as expires_at
FROM public.tenants t
CROSS JOIN (
  SELECT id FROM public.billing_plans 
  WHERE name = 'Starter' AND is_active = true 
  LIMIT 1
) bp
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_subscriptions ts 
    WHERE ts.tenant_id = t.id AND ts.status = 'active'
  );