-- Permanent User Authentication Fix
-- This creates a proper long-term solution for user authentication and profile mapping
-- User: tractionenergies@gmail.com, Tenant Admin

-- Step 1: Find the correct user ID from auth.users table
-- This will show us the actual user ID for tractionenergies@gmail.com
SELECT 
  'Auth User Lookup' as info_type,
  au.id as user_id,
  au.email,
  au.created_at
FROM auth.users au
WHERE au.email = 'tractionenergies@gmail.com';

-- Step 2: Clean up any existing profile records for this email
-- First, let's see what exists
SELECT 
  'Existing Profiles' as info_type,
  p.id::text,
  p.user_id::text,
  p.tenant_id::text,
  p.role::text,
  p.full_name
FROM public.profiles p
WHERE p.user_id IN (
  SELECT au.id FROM auth.users au WHERE au.email = 'tractionenergies@gmail.com'
);

-- Step 3: Create or update the profile record with the correct user ID
-- This will work regardless of whether a profile exists or not
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
  au.id,
  '6742eb8a-434e-4c14-a91c-6d55adeb5750',
  'admin'::user_role,
  'Justus Wanjala',
  NULL,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'tractionenergies@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
  tenant_id = '6742eb8a-434e-4c14-a91c-6d55adeb5750',
  role = 'admin'::user_role,
  full_name = 'Justus Wanjala',
  updated_at = NOW();

-- Step 4: Create or update the tenant_users record
INSERT INTO public.tenant_users (
  id,
  tenant_id,
  user_id,
  role,
  is_active,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '6742eb8a-434e-4c14-a91c-6d55adeb5750',
  au.id,
  'admin'::user_role,
  true,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'tractionenergies@gmail.com'
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = 'admin'::user_role,
  is_active = true,
  updated_at = NOW();

-- Step 5: Restore the proper get_user_tenant_id function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Get user's tenant_id from profiles table using user_id
    SELECT tenant_id INTO user_tenant_id
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    -- If not found in profiles, try tenant_users table
    IF user_tenant_id IS NULL THEN
        SELECT tenant_id INTO user_tenant_id
        FROM public.tenant_users
        WHERE user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN user_tenant_id;
END;
$$;

-- Step 6: Test the complete solution
SELECT 
  'Final Test' as test_type,
  get_user_tenant_id() as tenant_id_result,
  get_current_user_role() as role_result;

-- Step 7: Verify the records
SELECT 
  'Final Profile' as record_type,
  p.id::text,
  p.user_id::text,
  p.tenant_id::text,
  p.role::text,
  p.full_name
FROM public.profiles p
WHERE p.user_id IN (
  SELECT au.id FROM auth.users au WHERE au.email = 'tractionenergies@gmail.com'
)

UNION ALL

SELECT 
  'Final Tenant User' as record_type,
  tu.id::text,
  tu.user_id::text,
  tu.tenant_id::text,
  tu.role::text,
  '' as full_name
FROM public.tenant_users tu
WHERE tu.user_id IN (
  SELECT au.id FROM auth.users au WHERE au.email = 'tractionenergies@gmail.com'
);
