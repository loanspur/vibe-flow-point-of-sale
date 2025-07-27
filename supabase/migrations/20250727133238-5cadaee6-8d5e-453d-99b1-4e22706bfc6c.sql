-- Fix user profile and tenant association
UPDATE profiles 
SET 
  tenant_id = '0d86b96e-483e-4e64-8152-96ae6da641a7',
  role = 'admin',
  updated_at = NOW()
WHERE user_id = '71ebd120-c13b-4f57-a6ea-d197c52bda88';

-- Ensure tenant_users record exists
INSERT INTO tenant_users (tenant_id, user_id, role, is_active, created_at)
VALUES (
  '0d86b96e-483e-4e64-8152-96ae6da641a7',
  '71ebd120-c13b-4f57-a6ea-d197c52bda88',
  'admin',
  true,
  NOW()
) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = 'admin',
  is_active = true;