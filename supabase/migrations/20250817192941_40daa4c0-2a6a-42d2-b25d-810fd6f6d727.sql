-- Fix the validate_role_assignment function to allow invitation acceptance
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role user_role;
  old_user_role user_role;
  is_self_update boolean;
  current_auth_uid uuid;
BEGIN
  -- Get current authenticated user ID (will be NULL for admin/server-side operations)
  current_auth_uid := auth.uid();

  -- Allow operations with no auth context (e.g., migrations, admin jobs)
  IF current_auth_uid IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if user is trying to update their own tenant_users record
  is_self_update := (NEW.user_id = current_auth_uid);
  
  -- Get current user's role (only if authenticated)
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = current_auth_uid;
  
  -- Get the old role if this is an update
  IF TG_OP = 'UPDATE' THEN
    old_user_role := OLD.role;
  END IF;
  
  -- For self-updates to tenant_users, only prevent role changes
  -- Allow other updates like invitation acceptance
  IF is_self_update AND TG_OP = 'UPDATE' THEN
    -- Users cannot change their own role, but can accept invitations
    IF NEW.role != OLD.role THEN
      RAISE EXCEPTION 'Users cannot change their own role. Contact an administrator.';
    END IF;
    -- Allow the update if role hasn't changed
    RETURN NEW;
  END IF;
  
  -- Only superadmins can assign superadmin role
  IF NEW.role = 'owner' AND (current_user_role IS NULL OR current_user_role != 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can assign owner role';
  END IF;
  
  -- Only admins and superadmins can assign admin role
  IF NEW.role = 'admin' AND (current_user_role IS NULL OR current_user_role NOT IN ('admin', 'superadmin')) THEN
    RAISE EXCEPTION 'Only admins or superadmins can assign admin role';
  END IF;
  
  -- Log role changes for audit (only if authenticated and role changed)
  IF TG_OP = 'UPDATE' AND NEW.role != OLD.role AND current_auth_uid IS NOT NULL THEN
    INSERT INTO user_activity_logs (
      tenant_id, user_id, action_type, resource_type, resource_id, details
    ) VALUES (
      NEW.tenant_id, 
      current_auth_uid, 
      'role_change', 
      'tenant_user', 
      NEW.user_id,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'target_user', NEW.user_id,
        'changed_by', current_auth_uid
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;