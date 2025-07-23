-- Create missing tenant_users association for the superadmin user
INSERT INTO tenant_users (tenant_id, user_id, role, is_active) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'ef237ab3-4e66-4dd8-91bb-ddceeb69be62', 
  'superadmin', 
  true
)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET 
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;