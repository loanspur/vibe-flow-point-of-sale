-- Get a system admin user ID as fallback
DO $$
DECLARE
  system_admin_id UUID;
BEGIN
  -- Get the first superadmin user
  SELECT user_id INTO system_admin_id 
  FROM profiles 
  WHERE role = 'superadmin' 
  LIMIT 1;
  
  -- If no superadmin, get any admin user
  IF system_admin_id IS NULL THEN
    SELECT user_id INTO system_admin_id 
    FROM tenant_users 
    WHERE role IN ('admin', 'owner') 
    LIMIT 1;
  END IF;
  
  -- Create subdomain entries for existing tenants
  INSERT INTO public.tenant_domains (
    tenant_id, 
    domain_name, 
    domain_type, 
    status, 
    is_primary, 
    is_active,
    verified_at,
    created_by
  )
  SELECT 
    t.id as tenant_id,
    CASE 
      WHEN t.name IS NOT NULL AND t.name != '' THEN 
        lower(regexp_replace(t.name, '[^a-zA-Z0-9]', '-', 'g')) || '.vibepos.shop'
      ELSE 
        'tenant-' || t.id || '.vibepos.shop'
    END as domain_name,
    'subdomain' as domain_type,
    'verified' as status,
    true as is_primary,
    true as is_active,
    NOW() as verified_at,
    COALESCE(
      (SELECT user_id FROM tenant_users WHERE tenant_id = t.id AND role IN ('owner', 'admin') LIMIT 1),
      system_admin_id
    ) as created_by
  FROM public.tenants t
  WHERE t.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.tenant_domains td 
      WHERE td.tenant_id = t.id AND td.domain_type = 'subdomain'
    );
END $$;