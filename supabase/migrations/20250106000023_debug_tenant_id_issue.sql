-- Debug Tenant ID Issue
-- Let's see what's actually in the database

-- Check if the profile record exists and what it contains
SELECT 
  'Profile Check' as check_type,
  p.id::text,
  p.user_id::text,
  p.tenant_id::text,
  p.role::text,
  p.full_name,
  'Profile exists' as status
FROM public.profiles p
WHERE p.user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e'

UNION ALL

-- Check what auth.uid() returns
SELECT 
  'Auth Check' as check_type,
  auth.uid()::text as id,
  auth.uid()::text as user_id,
  NULL::text as tenant_id,
  NULL::text as role,
  'Current auth user' as full_name,
  'Auth user ID' as status

UNION ALL

-- Check tenant_users table
SELECT 
  'Tenant User Check' as check_type,
  tu.id::text,
  tu.user_id::text,
  tu.tenant_id::text,
  tu.role::text,
  '' as full_name,
  'Tenant user exists' as status
FROM public.tenant_users tu
WHERE tu.user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e';

-- Test the function step by step
SELECT 
  'Step 1: Direct profile query' as test_step,
  p.tenant_id as result
FROM public.profiles p
WHERE p.user_id = auth.uid();

-- Test with the specific user ID
SELECT 
  'Step 2: Specific user ID query' as test_step,
  p.tenant_id as result
FROM public.profiles p
WHERE p.user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e';
