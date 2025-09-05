-- Fix User Profile and Role Assignment
-- This migration fixes the missing profile record and incorrect role assignment
-- that's preventing purchases from being displayed

-- Step 1: Create missing profile record for the user
INSERT INTO public.profiles (
  id,
  user_id,
  tenant_id,
  role,
  full_name,
  avatar_url,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e',
  '6742eb8a-434e-4c14-a91c-6d55adeb5750',
  'admin'::user_role,
  'Justus Wanjala',
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e'
);

-- Step 2: Update the role in tenant_users table from 'user' to 'admin'
UPDATE public.tenant_users 
SET 
  role = 'admin'::user_role,
  updated_at = NOW()
WHERE 
  user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e'
  AND tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750';

-- Step 3: Verify the fixes
-- This will show the updated records
SELECT 
  'Profile Record' as record_type,
  p.id::text,
  p.user_id::text,
  p.tenant_id::text,
  p.role::text,
  p.full_name
FROM public.profiles p
WHERE p.user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e'

UNION ALL

SELECT 
  'Tenant User Record' as record_type,
  tu.id::text,
  tu.user_id::text,
  tu.tenant_id::text,
  tu.role::text,
  '' as full_name
FROM public.tenant_users tu
WHERE tu.user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e';

-- Step 4: Test the get_user_tenant_id function
SELECT 
  'Function Test' as test_type,
  get_user_tenant_id() as tenant_id_result,
  get_current_user_role() as role_result;
