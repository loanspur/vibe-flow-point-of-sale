-- Update superadmin profile with tenant and create tenant_users association
UPDATE public.profiles 
SET tenant_id = '11111111-1111-1111-1111-111111111111'
WHERE role = 'superadmin' AND user_id = auth.uid();

-- Insert into tenant_users if not exists
INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active)
SELECT '11111111-1111-1111-1111-111111111111', auth.uid(), 'admin', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_users 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND user_id = auth.uid()
);