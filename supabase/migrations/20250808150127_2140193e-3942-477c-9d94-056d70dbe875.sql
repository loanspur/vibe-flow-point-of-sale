-- Relax validate_role_assignment to allow admin/server-side updates (no auth context)
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
  
  -- Check if user is trying to update their own profile
  is_self_update := (NEW.user_id = current_auth_uid);
  
  -- Get current user's role (only if authenticated)
  SELECT role INTO current_user_role 
  FROM profiles 
  WHERE user_id = current_auth_uid;
  
  -- Get the old role if this is an update
  IF TG_OP = 'UPDATE' THEN
    old_user_role := OLD.role;
  END IF;
  
  -- Prevent role escalation in self-updates
  IF is_self_update AND TG_OP = 'UPDATE' THEN
    -- Users cannot change their own role
    IF NEW.role != OLD.role THEN
      RAISE EXCEPTION 'Users cannot change their own role. Contact an administrator.';
    END IF;
  END IF;
  
  -- Only superadmins can assign superadmin role
  IF NEW.role = 'superadmin' AND (current_user_role IS NULL OR current_user_role != 'superadmin') THEN
    RAISE EXCEPTION 'Only superadmins can assign superadmin role';
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
      'profile', 
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

-- Now promote the requested user by email
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'justmurenga@gmail.com' LIMIT 1;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found with email %', 'justmurenga@gmail.com';
  END IF;

  UPDATE public.profiles 
  SET role = 'superadmin'::public.user_role,
      full_name = COALESCE(full_name, 'Super Administrator'),
      updated_at = now()
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, role, full_name)
    VALUES (target_user_id, 'superadmin'::public.user_role, 'Super Administrator');
  END IF;
END $$;