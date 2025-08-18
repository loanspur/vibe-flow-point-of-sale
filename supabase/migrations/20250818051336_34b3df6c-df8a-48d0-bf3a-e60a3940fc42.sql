-- Update tenant creation process to automatically create Administrator role
-- and add admin roles to all existing tenants (Fixed version with tenant_id)

-- 1. First, update the handle_new_tenant function to include admin role creation
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_owner_id uuid;
BEGIN
  -- Setup default accounts
  PERFORM setup_default_accounts(NEW.id);
  
  -- Setup default features
  PERFORM setup_tenant_default_features(NEW.id);
  
  -- Setup default user roles
  PERFORM setup_default_user_roles(NEW.id);
  
  -- Setup default business settings
  PERFORM setup_default_business_settings(NEW.id);
  
  -- Find the tenant owner/admin user (first admin user for this tenant)
  SELECT tu.user_id INTO tenant_owner_id
  FROM tenant_users tu
  WHERE tu.tenant_id = NEW.id 
    AND tu.role IN ('admin', 'owner', 'superadmin')
    AND tu.is_active = true
  ORDER BY tu.created_at ASC
  LIMIT 1;
  
  -- If we found a tenant owner, create the Administrator role
  IF tenant_owner_id IS NOT NULL THEN
    PERFORM create_initial_admin_role(NEW.id, tenant_owner_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Create a function to ensure all existing tenants have Administrator roles
CREATE OR REPLACE FUNCTION public.ensure_all_tenants_have_admin_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_record RECORD;
  tenant_owner_id uuid;
  admin_role_id uuid;
  permission_record RECORD;
  existing_admin_role_id uuid;
  existing_assignment boolean;
BEGIN
  -- Loop through all tenants
  FOR tenant_record IN 
    SELECT id, name FROM tenants WHERE is_active = true
  LOOP
    -- Check if this tenant already has an Administrator role
    SELECT id INTO existing_admin_role_id
    FROM user_roles 
    WHERE tenant_id = tenant_record.id 
      AND name = 'Administrator' 
      AND is_active = true;
    
    -- If no Administrator role exists, create one
    IF existing_admin_role_id IS NULL THEN
      -- Find the first admin/owner user for this tenant
      SELECT tu.user_id INTO tenant_owner_id
      FROM tenant_users tu
      WHERE tu.tenant_id = tenant_record.id 
        AND tu.role IN ('admin', 'owner', 'superadmin')
        AND tu.is_active = true
      ORDER BY tu.created_at ASC
      LIMIT 1;
      
      -- If we found an admin user, create the Administrator role
      IF tenant_owner_id IS NOT NULL THEN
        -- Create the Administrator role
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
        ) VALUES (
          tenant_record.id,
          'Administrator',
          'Full system access with all privileges for tenant administration',
          false,
          true,
          true,
          jsonb_build_object('all', true),
          1,
          '#dc2626',
          true,
          true,
          true,
          tenant_owner_id
        ) RETURNING id INTO admin_role_id;
        
        -- Grant all system permissions to the Administrator role
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
          );
        END LOOP;
        
        -- Check if role assignment already exists
        SELECT EXISTS(
          SELECT 1 FROM user_role_assignments 
          WHERE user_id = tenant_owner_id AND role_id = admin_role_id
        ) INTO existing_assignment;
        
        -- Assign the Administrator role to the tenant owner if not already assigned
        IF NOT existing_assignment THEN
          INSERT INTO user_role_assignments (
            user_id,
            role_id,
            tenant_id,
            assigned_by,
            is_active
          ) VALUES (
            tenant_owner_id,
            admin_role_id,
            tenant_record.id,
            tenant_owner_id,
            true
          );
        END IF;
        
        RAISE NOTICE 'Created Administrator role for tenant: % (ID: %)', tenant_record.name, tenant_record.id;
      ELSE
        RAISE NOTICE 'No admin user found for tenant: % (ID: %)', tenant_record.name, tenant_record.id;
      END IF;
    ELSE
      -- Admin role already exists, ensure it has all permissions
      DELETE FROM role_permissions WHERE role_id = existing_admin_role_id;
      
      FOR permission_record IN 
        SELECT id FROM system_permissions 
      LOOP
        INSERT INTO role_permissions (
          role_id,
          permission_id,
          granted
        ) VALUES (
          existing_admin_role_id,
          permission_record.id,
          true
        );
      END LOOP;
      
      RAISE NOTICE 'Updated permissions for existing Administrator role in tenant: % (ID: %)', tenant_record.name, tenant_record.id;
    END IF;
  END LOOP;
END;
$function$;

-- 3. Execute the function to ensure all existing tenants have Administrator roles
SELECT ensure_all_tenants_have_admin_roles();

-- 4. Update the handle_new_tenant_admin function to create admin role if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_tenant_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_assignment boolean;
BEGIN
  -- If this is the first admin/owner for the tenant, create initial admin role
  IF NEW.role IN ('admin', 'owner', 'superadmin') AND NEW.is_active = true THEN
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
      SELECT EXISTS(
        SELECT 1 FROM user_role_assignments ura
        JOIN user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = NEW.user_id 
        AND ur.tenant_id = NEW.tenant_id 
        AND ur.name = 'Administrator'
        AND ura.is_active = true
      ) INTO existing_assignment;
      
      IF NOT existing_assignment THEN
        INSERT INTO user_role_assignments (
          user_id,
          role_id,
          tenant_id,
          assigned_by,
          is_active
        )
        SELECT 
          NEW.user_id,
          ur.id,
          NEW.tenant_id,
          NEW.user_id,
          true
        FROM user_roles ur
        WHERE ur.tenant_id = NEW.tenant_id 
        AND ur.name = 'Administrator'
        AND ur.is_active = true
        LIMIT 1;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;