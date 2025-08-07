-- Remove all hardcoded system roles
DELETE FROM user_roles WHERE is_system_role = true;

-- Update the setup_default_user_roles function to not create hardcoded roles
CREATE OR REPLACE FUNCTION public.setup_default_user_roles(tenant_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- This function now only ensures the tenant has the capability to create roles
  -- No default roles are created - tenant admins can create their own roles
  
  -- Log that tenant role system is initialized
  INSERT INTO user_activity_logs (
    tenant_id, 
    user_id, 
    action_type, 
    resource_type, 
    details
  ) VALUES (
    tenant_id_param,
    NULL, -- System action
    'system_initialized',
    'role_system',
    jsonb_build_object(
      'message', 'Role system initialized for tenant',
      'tenant_id', tenant_id_param
    )
  );
  
END;
$function$;

-- Create a function to create default admin role for new tenants
CREATE OR REPLACE FUNCTION public.create_initial_admin_role(tenant_id_param uuid, admin_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_role_id uuid;
BEGIN
  -- Create a basic admin role for the tenant owner
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
    'Full system access for tenant administrator', 
    false, -- Not a system role, can be edited
    true, 
    true,
    jsonb_build_object('all', true), -- Full permissions
    1,
    '#dc2626',
    admin_user_id
  )
  RETURNING id INTO admin_role_id;
  
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
  
  RETURN admin_role_id;
END;
$function$;

-- Add a trigger to auto-create admin role for tenant owners
CREATE OR REPLACE FUNCTION public.handle_new_tenant_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If this is the first admin/owner for the tenant, create initial admin role
  IF NEW.role IN ('admin', 'owner') AND NEW.is_active = true THEN
    -- Check if this tenant already has roles
    IF NOT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE tenant_id = NEW.tenant_id 
      AND is_active = true
    ) THEN
      -- Create initial admin role
      PERFORM create_initial_admin_role(NEW.tenant_id, NEW.user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new tenant admins
DROP TRIGGER IF EXISTS trigger_new_tenant_admin ON tenant_users;
CREATE TRIGGER trigger_new_tenant_admin
  AFTER INSERT ON tenant_users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_tenant_admin();