-- Manually activate the Enterprise subscription for the user who has already paid
-- Insert/Update subscription details for tenant 11111111-1111-1111-1111-111111111111

-- First, create a payment history record
INSERT INTO payment_history (
  id,
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
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'afccbab2-2451-4957-8a4a-51e6a86f7e85', -- Enterprise plan ID
  20.00,
  'KES',
  'TGO9E045DN',
  'completed',
  'subscription',
  now(),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  true,
  EXTRACT(DAY FROM (CURRENT_DATE + INTERVAL '1 month' - CURRENT_DATE)),
  now(),
  now()
) ON CONFLICT (payment_reference) DO UPDATE SET
  payment_status = 'completed',
  paid_at = now(),
  updated_at = now();

-- Create or update tenant subscription details
INSERT INTO tenant_subscription_details (
  id,
  tenant_id,
  billing_plan_id,
  status,
  current_period_start,
  current_period_end,
  next_billing_date,
  trial_end,
  created_at,
  updated_at,
  metadata
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  'active',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  CURRENT_DATE + INTERVAL '30 days',
  null,
  now(),
  now(),
  json_build_object(
    'last_payment_reference', 'TGO9E045DN',
    'last_payment_amount', 20.00,
    'payment_verified_at', now()::text,
    'manually_activated', true
  )
) ON CONFLICT (tenant_id) DO UPDATE SET
  billing_plan_id = 'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  status = 'active',
  current_period_start = CURRENT_DATE,
  current_period_end = CURRENT_DATE + INTERVAL '30 days',
  next_billing_date = CURRENT_DATE + INTERVAL '30 days',
  updated_at = now(),
  metadata = json_build_object(
    'last_payment_reference', 'TGO9E045DN',
    'last_payment_amount', 20.00,
    'payment_verified_at', now()::text,
    'manually_activated', true
  );

-- Also update the legacy tenant_subscriptions table for backward compatibility
INSERT INTO tenant_subscriptions (
  id,
  tenant_id,
  billing_plan_id,
  status,
  amount,
  currency,
  reference,
  expires_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  'active',
  20.00,
  'KES',
  'TGO9E045DN',
  CURRENT_DATE + INTERVAL '30 days',
  now(),
  now()
) ON CONFLICT (tenant_id) DO UPDATE SET
  billing_plan_id = 'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  status = 'active',
  amount = 20.00,
  reference = 'TGO9E045DN',
  expires_at = CURRENT_DATE + INTERVAL '30 days',
  updated_at = now();