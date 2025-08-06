-- Create test tenant for staging subdomain
INSERT INTO tenants (
  id, 
  name, 
  slug, 
  email, 
  phone, 
  status,
  subscription_status,
  plan_type,
  trial_ends_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test Tenant',
  'test-tenant',
  'test@example.com',
  '+1234567890',
  'active',
  'trial',
  'basic',
  now() + interval '30 days',
  now(),
  now()
) 
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status,
  updated_at = now();

-- Get the tenant ID and create subdomain
DO $$
DECLARE
  tenant_uuid UUID;
BEGIN
  -- Get the tenant ID
  SELECT id INTO tenant_uuid FROM tenants WHERE slug = 'test-tenant';
  
  -- Create subdomain entry
  INSERT INTO tenant_domains (
    tenant_id,
    domain_name,
    domain_type,
    status,
    ssl_status,
    is_primary,
    is_active,
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
    now()
  )
  ON CONFLICT (domain_name) DO UPDATE SET
    status = 'verified',
    ssl_status = 'issued',
    is_primary = true,
    is_active = true,
    updated_at = now();
END $$;