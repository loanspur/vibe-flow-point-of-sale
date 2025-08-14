-- Update the create_initial_admin_role function to create a comprehensive admin role
CREATE OR REPLACE FUNCTION public.create_initial_admin_role(tenant_id_param uuid, admin_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_role_id uuid;
  permission_record RECORD;
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
  
  -- Assign the admin role to the tenant owner
  INSERT INTO user_role_assignments (
    user_id,
    role_id,
    assigned_by,
    is_active
  ) VALUES (
    admin_user_id,
    admin_role_id,
    admin_user_id,
    true
  ) ON CONFLICT (user_id, role_id) DO NOTHING;
  
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

-- Update the handle_new_tenant_admin trigger to ensure admin role creation
CREATE OR REPLACE FUNCTION public.handle_new_tenant_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- If this is the first admin/owner for the tenant, create initial admin role
  IF NEW.role IN ('admin', 'owner') AND NEW.is_active = true THEN
    -- Check if this tenant already has an Administrator role
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE tenant_id = NEW.tenant_id 
      AND name = 'Administrator'
      AND is_active = true
    ) THEN
      -- Create initial admin role with full privileges
      PERFORM create_initial_admin_role(NEW.tenant_id, NEW.user_id);
    ELSE
      -- If Administrator role exists, assign it to the new admin user
      INSERT INTO user_role_assignments (
        user_id,
        role_id,
        assigned_by,
        is_active
      )
      SELECT 
        NEW.user_id,
        ur.id,
        NEW.user_id,
        true
      FROM user_roles ur
      WHERE ur.tenant_id = NEW.tenant_id 
      AND ur.name = 'Administrator'
      AND ur.is_active = true
      LIMIT 1
      ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;