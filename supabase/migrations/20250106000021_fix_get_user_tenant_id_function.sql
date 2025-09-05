-- Fix get_user_tenant_id Function
-- The function is using the wrong column name - it should use user_id instead of id

-- Drop and recreate the function with the correct column reference
DROP FUNCTION IF EXISTS public.get_user_tenant_id() CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_tenant_id UUID;
BEGIN
    -- Get user's tenant_id from profiles table using user_id (not id)
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

-- Test the function
SELECT 
  'Fixed Function Test' as test_type,
  get_user_tenant_id() as tenant_id_result,
  get_current_user_role() as role_result;
