-- Update create_initial_admin_role function to include tenant_id in user_role_assignments
CREATE OR REPLACE FUNCTION public.create_initial_admin_role(tenant_id_param uuid, admin_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_role_id uuid;
  permission_record RECORD;
  existing_assignment boolean;
BEGIN
  -- Create a comprehensive admin role for the tenant owner
  INSERT INTO user_roles (
    tenant_id, 
    name, 
    description, 
    is_system_role, 
    is_active, 
    is_editable,
    permissions,
    level,
    color,
    can_manage_users,
    can_manage_settings,
    can_view_reports,
    created_by
  )
  VALUES (
    tenant_id_param, 
    'Administrator', 
    'Full system access for tenant administrator with all privileges', 
    false, -- Not a system role, can be edited
    true, 
    true,
    jsonb_build_object('all', true), -- Full permissions
    1,
    '#dc2626',
    true,
    true,
    true,
    admin_user_id
  )
  RETURNING id INTO admin_role_id;
  
  -- Grant all system permissions to the admin role
  FOR permission_record IN 
    SELECT id FROM system_permissions 
  LOOP
    INSERT INTO role_permissions (
      role_id,
      permission_id,
      granted
    ) VALUES (
      admin_role_id,
      permission_record.id,
      true
    ) ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true;
  END LOOP;
  
  -- Check if role assignment already exists
  SELECT EXISTS(
    SELECT 1 FROM user_role_assignments 
    WHERE user_id = admin_user_id AND role_id = admin_role_id
  ) INTO existing_assignment;
  
  -- Assign the admin role to the tenant owner if not already assigned
  IF NOT existing_assignment THEN
    INSERT INTO user_role_assignments (
      user_id,
      role_id,
      tenant_id,
      assigned_by,
      is_active
    ) VALUES (
      admin_user_id,
      admin_role_id,
      tenant_id_param,
      admin_user_id,
      true
    );
  END IF;
  
  -- Log the role creation
  INSERT INTO user_activity_logs (
    tenant_id,
    user_id,
    action_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    tenant_id_param,
    admin_user_id,
    'role_created',
    'user_role',
    admin_role_id,
    jsonb_build_object(
      'role_name', 'Administrator',
      'permissions', 'all',
      'auto_created', true
    )
  );
  
  RETURN admin_role_id;
END;
$function$;