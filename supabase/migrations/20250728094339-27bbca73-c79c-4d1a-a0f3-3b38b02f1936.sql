-- Update Walela tenant subscription to Enterprise
-- First, check if subscription record exists and create/update accordingly
INSERT INTO tenant_subscription_details (
  tenant_id,
  billing_plan_id,
  status,
  current_period_start,
  current_period_end,
  next_billing_date,
  next_billing_amount,
  created_at,
  updated_at
) VALUES (
  '24cf2d8c-7a7d-4d23-9999-de65800620ff',
  'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  'active',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 year',
  CURRENT_DATE + INTERVAL '1 year',
  0,
  NOW(),
  NOW()
) ON CONFLICT (tenant_id) DO UPDATE SET
  billing_plan_id = 'afccbab2-2451-4957-8a4a-51e6a86f7e85',
  status = 'active',
  current_period_end = CURRENT_DATE + INTERVAL '1 year',
  next_billing_date = CURRENT_DATE + INTERVAL '1 year',
  updated_at = NOW();

-- Enable all Enterprise features for Walela
INSERT INTO tenant_feature_access (tenant_id, feature_name, is_enabled, expires_at)
VALUES 
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'basic_pos', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'product_management', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'customer_management', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'sales_reporting', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'inventory_tracking', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'user_management', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'advanced_analytics', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'multi_location', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'api_access', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'custom_reports', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'advanced_inventory', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'accounting_integration', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'bulk_operations', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'advanced_permissions', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'custom_fields', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'webhook_integrations', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'white_label', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'advanced_security', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'priority_support', true, CURRENT_DATE + INTERVAL '1 year'),
  ('24cf2d8c-7a7d-4d23-9999-de65800620ff', 'custom_training', true, CURRENT_DATE + INTERVAL '1 year')
ON CONFLICT (tenant_id, feature_name) DO UPDATE SET
  is_enabled = true,
  expires_at = CURRENT_DATE + INTERVAL '1 year',
  updated_at = NOW();