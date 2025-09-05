-- Fix User ID Mismatch
-- The profile record exists for a different user ID than the current auth.uid()
-- We need to update the profile record to use the correct user ID

-- First, let's see what auth.uid() actually returns
SELECT 
  'Current Auth User' as info_type,
  auth.uid() as current_user_id;

-- Update the profile record to use the correct user ID
UPDATE public.profiles 
SET 
  user_id = auth.uid(),
  updated_at = NOW()
WHERE user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e';

-- Update the tenant_users record to use the correct user ID
UPDATE public.tenant_users 
SET 
  user_id = auth.uid(),
  updated_at = NOW()
WHERE user_id = 'edc7a1bd-8ca4-4c20-baba-0b2fc00f509e';

-- Test the function now
SELECT 
  'Fixed Function Test' as test_type,
  get_user_tenant_id() as tenant_id_result,
  get_current_user_role() as role_result;

-- Verify the records were updated
SELECT 
  'Updated Profile' as record_type,
  p.id::text,
  p.user_id::text,
  p.tenant_id::text,
  p.role::text,
  p.full_name
FROM public.profiles p
WHERE p.user_id = auth.uid()

UNION ALL

SELECT 
  'Updated Tenant User' as record_type,
  tu.id::text,
  tu.user_id::text,
  tu.tenant_id::text,
  tu.role::text,
  '' as full_name
FROM public.tenant_users tu
WHERE tu.user_id = auth.uid();
