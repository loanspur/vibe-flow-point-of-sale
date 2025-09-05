-- Simple Fix for get_user_tenant_id Function
-- This avoids deadlock by just updating the function without dropping it

-- Just recreate the function (PostgreSQL will replace it)
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
  'Simple Fix Test' as test_type,
  get_user_tenant_id() as tenant_id_result,
  get_current_user_role() as role_result;
