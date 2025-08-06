-- Create test tenant for staging subdomain
INSERT INTO tenants (
  id, 
  name, 
  subdomain,
  contact_email, 
  contact_phone, 
  status,
  plan_type,
  is_active,
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
  true,
  now(),
  now()
) 
ON CONFLICT (subdomain) DO UPDATE SET
  name = EXCLUDED.name,
  contact_email = EXCLUDED.contact_email,
  status = EXCLUDED.status,
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