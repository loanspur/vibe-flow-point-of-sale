-- Fix database security warnings from linter
-- 1. Fix function search paths for security (functions created in recent migrations)

-- Update get_permission_error_message function
CREATE OR REPLACE FUNCTION public.get_permission_error_message(
  p_resource text,
  p_action text,
  p_user_role text
)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  error_msg text;
BEGIN
  -- Check if user role is admin/superadmin and provide appropriate message
  IF p_user_role IN ('admin', 'superadmin') THEN
    RETURN 'System configuration required. Please check your role permissions or contact system administrator.';
  END IF;

  -- Build user-friendly error message based on resource and action
  CASE p_resource
    WHEN 'products' THEN
      CASE p_action
        WHEN 'create' THEN error_msg := 'You need product creation permissions to add new products. Contact your administrator to request access.';
        WHEN 'update' THEN error_msg := 'You need product editing permissions to modify products. Contact your administrator to request access.';
        WHEN 'delete' THEN error_msg := 'You need product deletion permissions to remove products. Contact your administrator to request access.';
        ELSE error_msg := 'You need product access permissions to view products. Contact your administrator to request access.';
      END CASE;
    WHEN 'sales' THEN
      CASE p_action
        WHEN 'create' THEN error_msg := 'You need sales permissions to process transactions. Contact your administrator to request access.';
        WHEN 'update' THEN error_msg := 'You need sales editing permissions to modify transactions. Contact your administrator to request access.';
        WHEN 'delete' THEN error_msg := 'You need sales deletion permissions to cancel transactions. Contact your administrator to request access.';
        ELSE error_msg := 'You need sales access permissions to view transactions. Contact your administrator to request access.';
      END CASE;
    WHEN 'purchases' THEN
      CASE p_action
        WHEN 'create' THEN error_msg := 'You need purchasing permissions to create purchase orders. Contact your administrator to request access.';
        WHEN 'update' THEN error_msg := 'You need purchase editing permissions to modify orders. Contact your administrator to request access.';
        WHEN 'delete' THEN error_msg := 'You need purchase deletion permissions to cancel orders. Contact your administrator to request access.';
        ELSE error_msg := 'You need purchase access permissions to view orders. Contact your administrator to request access.';
      END CASE;
    WHEN 'reports' THEN
      error_msg := 'You need reporting permissions to access ' || p_action || ' reports. Contact your administrator to request access.';
    WHEN 'cash_management' THEN
      error_msg := 'You need cash management permissions to perform cash operations. Contact your administrator to request access.';
    WHEN 'user_management' THEN
      error_msg := 'You need administrative permissions to manage users and roles. Contact your administrator to request access.';
    WHEN 'business_settings' THEN
      error_msg := 'You need administrative permissions to modify business settings. Contact your administrator to request access.';
    ELSE
      error_msg := 'Access denied: You don''t have permission to ' || p_action || ' in ' || replace(p_resource, '_', ' ') || '. Contact your administrator to request the necessary permissions.';
  END CASE;

  RETURN error_msg;
END;
$$;

-- Update check_user_permission_enhanced function  
CREATE OR REPLACE FUNCTION public.check_user_permission_enhanced(p_user_id uuid, p_resource text, p_action text DEFAULT 'read'::text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_permission boolean := false;
  user_role_name text;
  current_tenant_id uuid;
BEGIN
  -- Check if user is superadmin (bypass all checks)
  SELECT role INTO user_role_name 
  FROM profiles 
  WHERE user_id = p_user_id;
  
  IF user_role_name IN ('superadmin', 'admin') THEN
    RETURN true;
  END IF;

  -- Get user's tenant
  SELECT get_user_tenant_id() INTO current_tenant_id;
  
  -- Check specific permission through role assignments
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN role_permissions rp ON ura.role_id = rp.role_id
    JOIN system_permissions sp ON rp.permission_id = sp.id
    WHERE ura.user_id = p_user_id
      AND ura.tenant_id = current_tenant_id
      AND ura.is_active = true
      AND rp.granted = true
      AND sp.resource::text = p_resource
      AND sp.action::text = p_action
  ) INTO has_permission;
  
  -- If no specific permission found, check custom permissions
  IF NOT has_permission THEN
    SELECT EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN role_permissions rp ON ura.role_id = rp.role_id
      JOIN custom_permissions cp ON rp.permission_id = cp.id
      WHERE ura.user_id = p_user_id
        AND ura.tenant_id = current_tenant_id
        AND ura.is_active = true
        AND rp.granted = true
        AND cp.resource = p_resource
        AND cp.action = p_action
    ) INTO has_permission;
  END IF;
  
  RETURN has_permission;
END;
$$;

-- Update get_current_user_role function with proper search path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_role user_role;
BEGIN
  SELECT role INTO current_role
  FROM profiles 
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(current_role, 'user'::user_role);
END;
$$;

COMMENT ON FUNCTION public.get_permission_error_message IS 'Returns user-friendly error messages for permission denials';
COMMENT ON FUNCTION public.check_user_permission_enhanced IS 'Enhanced permission checking with tenant context and custom permissions';
COMMENT ON FUNCTION public.get_current_user_role IS 'Securely retrieves current user role, used in RLS policies';