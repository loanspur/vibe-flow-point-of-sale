-- Debug Authentication Script
-- Run this to check your current user setup

-- 1. Check all users
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    p.role,
    p.tenant_id,
    p.created_at as profile_created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
ORDER BY u.created_at;

-- 2. Check tenant_users relationships
SELECT 
    tu.tenant_id,
    tu.user_id,
    tu.role as tenant_role,
    u.email,
    t.name as tenant_name,
    t.subdomain
FROM public.tenant_users tu
JOIN auth.users u ON tu.user_id = u.id
JOIN public.tenants t ON tu.tenant_id = t.id;

-- 3. Check what tenants exist
SELECT * FROM public.tenants;
