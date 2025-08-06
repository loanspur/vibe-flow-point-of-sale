-- Remove test tenant subdomain staging data
DELETE FROM tenant_domains 
WHERE domain_name = 'test-tenant.vibe-flow-point-of-sale.lovable.app';

-- Remove test tenant data
DELETE FROM tenants 
WHERE subdomain = 'test-tenant' AND name = 'Test Tenant';

-- Clean up any orphaned tenant users for test tenant (if any)
DELETE FROM tenant_users 
WHERE tenant_id NOT IN (SELECT id FROM tenants);

-- Clean up any orphaned business settings for test tenant (if any)
DELETE FROM business_settings 
WHERE tenant_id NOT IN (SELECT id FROM tenants);