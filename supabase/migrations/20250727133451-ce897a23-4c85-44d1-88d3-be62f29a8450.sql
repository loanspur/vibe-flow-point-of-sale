-- Set up feature access for the trial tenant (first part that worked)
INSERT INTO tenant_feature_access (tenant_id, feature_name, is_enabled, created_at, updated_at)
VALUES 
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'basic_pos', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'product_management', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'customer_management', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'sales_reporting', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'inventory_tracking', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'user_management', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'mobile_app_access', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'email_support', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'standard_reports', true, NOW(), NOW()),
  ('0d86b96e-483e-4e64-8152-96ae6da641a7', 'basic_inventory_management', true, NOW(), NOW())
ON CONFLICT (tenant_id, feature_name) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();