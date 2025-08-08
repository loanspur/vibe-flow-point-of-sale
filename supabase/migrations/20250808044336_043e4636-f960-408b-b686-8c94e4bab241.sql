-- Create a simple debug function to test authentication
CREATE OR REPLACE FUNCTION public.debug_user_auth()
RETURNS TABLE(
  auth_uid_result uuid,
  user_tenant_id_result uuid,
  current_role_result user_role,
  profile_exists boolean,
  tenant_user_exists boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  auth_id uuid;
  profile_tenant uuid;
  profile_role user_role;
  has_profile boolean;
  has_tenant_user boolean;
BEGIN
  -- Get the authenticated user ID
  auth_id := auth.uid();
  
  -- Check if profile exists and get tenant/role
  SELECT tenant_id, role, true 
  INTO profile_tenant, profile_role, has_profile
  FROM profiles 
  WHERE user_id = auth_id;
  
  -- Check if tenant_users entry exists
  SELECT true INTO has_tenant_user
  FROM tenant_users 
  WHERE user_id = auth_id AND is_active = true;
  
  -- Return debug information
  RETURN QUERY SELECT 
    auth_id,
    profile_tenant,
    profile_role,
    COALESCE(has_profile, false),
    COALESCE(has_tenant_user, false);
END;
$function$;