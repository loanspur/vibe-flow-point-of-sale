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
  'verified' as status, -- Subdomains are automatically verified
  true as is_primary,
  true as is_active,
  NOW() as verified_at,
  (SELECT user_id FROM tenant_users WHERE tenant_id = t.id AND role IN ('owner', 'admin') LIMIT 1) as created_by
FROM public.tenants t
WHERE t.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_domains td 
    WHERE td.tenant_id = t.id AND td.domain_type = 'subdomain'
  );

-- Create function to auto-create subdomain when tenant is created
CREATE OR REPLACE FUNCTION public.create_tenant_subdomain()
RETURNS TRIGGER AS $$
DECLARE
  subdomain_name TEXT;
  admin_user_id UUID;
BEGIN
  -- Get the admin user for this tenant
  SELECT user_id INTO admin_user_id 
  FROM tenant_users 
  WHERE tenant_id = NEW.id 
    AND role IN ('owner', 'admin') 
  LIMIT 1;
  
  -- If no admin found, skip subdomain creation (will be created when admin is assigned)
  IF admin_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Generate subdomain from tenant name or ID
  IF NEW.name IS NOT NULL AND NEW.name != '' THEN
    subdomain_name := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g')) || '.vibepos.shop';
  ELSE
    subdomain_name := 'tenant-' || NEW.id || '.vibepos.shop';
  END IF;
  
  -- Insert subdomain record
  INSERT INTO public.tenant_domains (
    tenant_id, 
    domain_name, 
    domain_type, 
    status, 
    is_primary, 
    is_active,
    verified_at,
    created_by
  ) VALUES (
    NEW.id,
    subdomain_name,
    'subdomain',
    'verified', -- Subdomains are automatically verified
    true,
    true,
    NOW(),
    admin_user_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create subdomain for new tenants
DROP TRIGGER IF EXISTS trigger_create_tenant_subdomain ON public.tenants;
CREATE TRIGGER trigger_create_tenant_subdomain
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tenant_subdomain();