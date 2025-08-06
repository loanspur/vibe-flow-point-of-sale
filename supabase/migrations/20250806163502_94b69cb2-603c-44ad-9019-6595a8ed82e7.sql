-- Create test tenant for staging subdomain with proper requirements
INSERT INTO tenants (
  id, 
  name, 
  subdomain,
  contact_email, 
  contact_phone, 
  status,
  plan_type,
  billing_plan_id,
  is_active,
  created_by,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test Tenant',
  'test-tenant',
  'test@example.com',
  '+1234567890',
  'active',
  'basic',
  'd029b266-578b-4901-a000-832b67e580bb',
  true,
  'ef237ab3-4e66-4dd8-91bb-ddceeb69be62',
  now(),
  now()
) 
ON CONFLICT (subdomain) DO UPDATE SET
  name = EXCLUDED.name,
  contact_email = EXCLUDED.contact_email,
  status = EXCLUDED.status,
  billing_plan_id = EXCLUDED.billing_plan_id,
  updated_at = now();

-- Get the tenant ID and create subdomain
DO $$
DECLARE
  tenant_uuid UUID;
BEGIN
  -- Get the tenant ID
  SELECT id INTO tenant_uuid FROM tenants WHERE subdomain = 'test-tenant';
  
  -- Create subdomain entry for Lovable staging
  INSERT INTO tenant_domains (
    tenant_id,
    domain_name,
    domain_type,
    status,
    ssl_status,
    is_primary,
    is_active,
    verified_at,
    ssl_issued_at,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    tenant_uuid,
    'test-tenant.vibe-flow-point-of-sale.lovable.app',
    'subdomain',
    'verified',
    'issued',
    true,
    true,
    now(),
    now(),
    'ef237ab3-4e66-4dd8-91bb-ddceeb69be62',
    now(),
    now()
  )
  ON CONFLICT (domain_name) DO UPDATE SET
    status = 'verified',
    ssl_status = 'issued',
    is_primary = true,
    is_active = true,
    updated_at = now();
END $$;