-- Check if get_current_user_role function exists and create if missing
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role_val user_role;
BEGIN
  -- Get role from profiles table
  SELECT role INTO user_role_val
  FROM profiles
  WHERE user_id = auth.uid();
  
  RETURN user_role_val;
END;
$function$;

-- Ensure is_tenant_admin function exists
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT get_current_user_role() INTO user_role_val;
  RETURN user_role_val IN ('superadmin', 'admin', 'manager');
END;
$function$;