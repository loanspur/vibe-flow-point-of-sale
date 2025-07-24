-- Manually activate Enterprise subscription for tenant that already paid
-- Check if subscription already exists and update, otherwise insert

-- Update or insert tenant subscription details
UPDATE tenant_subscription_details 
SET 
  billing_plan_id = 'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  status = 'active',
  current_period_start = CURRENT_DATE,
  current_period_end = CURRENT_DATE + INTERVAL '30 days',
  next_billing_date = CURRENT_DATE + INTERVAL '30 days',
  updated_at = now(),
  metadata = jsonb_build_object(
    'last_payment_reference', 'TGO9E045DN',
    'last_payment_amount', 20.00,
    'payment_verified_at', now()::text,
    'manually_activated', true
  )
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- If no rows were updated, insert new record
INSERT INTO tenant_subscription_details (
  tenant_id,
  billing_plan_id,
  status,
  current_period_start,
  current_period_end,
  next_billing_date,
  created_at,
  updated_at,
  metadata
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  'active',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '30 days',
  now(),
  now(),
  jsonb_build_object(
    'last_payment_reference', 'TGO9E045DN',
    'last_payment_amount', 20.00,
    'payment_verified_at', now()::text,
    'manually_activated', true
  )
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_subscription_details 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
);

-- Update or insert tenant subscriptions for backward compatibility
UPDATE tenant_subscriptions 
SET 
  billing_plan_id = 'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  status = 'active',
  amount = 20.00,
  reference = 'TGO9E045DN',
  expires_at = CURRENT_DATE + INTERVAL '30 days',
  updated_at = now()
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- If no rows were updated, insert new record
INSERT INTO tenant_subscriptions (
  tenant_id,
  billing_plan_id,
  status,
  amount,
  currency,
  reference,
  expires_at,
  created_at,
  updated_at
)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  'active',
  20.00,
  'KES',
  'TGO9E045DN',
  CURRENT_DATE + INTERVAL '30 days',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_subscriptions 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
);

-- Insert payment history record
INSERT INTO payment_history (
  tenant_id,
  billing_plan_id,
  amount,
  currency,
  payment_reference,
  payment_status,
  payment_type,
  paid_at,
  billing_period_start,
  billing_period_end,
  is_prorated,
  prorated_days,
  created_at,
  updated_at
) 
SELECT 
  '11111111-1111-1111-1111-111111111111',
  'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  20.00,
  'KES',
  'TGO9E045DN',
  'completed',
  'subscription',
  now(),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  true,
  EXTRACT(DAY FROM (CURRENT_DATE + INTERVAL '1 month' - CURRENT_DATE))::integer,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM payment_history 
  WHERE payment_reference = 'TGO9E045DN'
);