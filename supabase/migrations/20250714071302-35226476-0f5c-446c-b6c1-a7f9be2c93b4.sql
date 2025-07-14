-- Update superadmin profile with tenant and create tenant_users association
UPDATE public.profiles 
SET tenant_id = '11111111-1111-1111-1111-111111111111'
WHERE role = 'superadmin' AND user_id = 'ef237ab3-4e66-4dd8-91bb-ddceeb69be62';

-- Insert into tenant_users
INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active)
VALUES ('11111111-1111-1111-1111-111111111111', 'ef237ab3-4e66-4dd8-91bb-ddceeb69be62', 'admin', true)
ON CONFLICT (tenant_id, user_id) DO NOTHING;