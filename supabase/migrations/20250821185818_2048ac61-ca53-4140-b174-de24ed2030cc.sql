-- Fix tenant admin integration with unified role management system

-- First, ensure tenant_users entries exist for all tenant admins
INSERT INTO public.tenant_users (tenant_id, user_id, role, is_active, invitation_status, created_at)
SELECT 
    p.tenant_id,
    p.user_id,
    'admin'::text,
    true,
    'accepted'::text,
    p.created_at
FROM public.profiles p
WHERE p.tenant_id IS NOT NULL 
    AND p.role = 'admin'
    AND NOT EXISTS (
        SELECT 1 FROM public.tenant_users tu 
        WHERE tu.tenant_id = p.tenant_id AND tu.user_id = p.user_id
    );

-- Create admin roles for existing tenants that don't have them
DO $$
DECLARE
    tenant_record RECORD;
    admin_record RECORD;
    existing_admin_role_id UUID;
    new_admin_role_id UUID;
BEGIN
    -- Loop through all tenants that have admin users but no unified admin role
    FOR tenant_record IN 
        SELECT DISTINCT t.id as tenant_id, t.created_by
        FROM public.tenants t
        JOIN public.profiles p ON p.tenant_id = t.id AND p.role = 'admin'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.tenant_id = t.id 
            AND ur.name = 'Administrator'
            AND ur.is_active = true
        )
    LOOP
        -- Create comprehensive admin role for this tenant
        INSERT INTO public.user_roles (
            tenant_id, 
            name, 
            description, 
            is_system_role, 
            is_active, 
            is_editable,
            level,
            color,
            can_manage_users,
            can_manage_settings,
            can_view_reports,
            created_by
        ) VALUES (
            tenant_record.tenant_id, 
            'Administrator', 
            'Full system access for tenant administrator with all privileges', 
            false,
            true, 
            true,
            1,
            '#dc2626',
            true,
            true,
            true,
            tenant_record.created_by
        ) RETURNING id INTO new_admin_role_id;
        
        -- Grant all system permissions to this admin role
        INSERT INTO public.role_permissions (role_id, permission_id, granted)
        SELECT new_admin_role_id, sp.id, true
        FROM public.system_permissions sp
        ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true;
        
        -- Assign this role to all admin users in this tenant
        FOR admin_record IN 
            SELECT p.user_id 
            FROM public.profiles p 
            WHERE p.tenant_id = tenant_record.tenant_id 
            AND p.role = 'admin'
        LOOP
            -- Create role assignment if it doesn't exist
            INSERT INTO public.user_role_assignments (
                user_id,
                role_id,
                tenant_id,
                assigned_by,
                is_active
            ) VALUES (
                admin_record.user_id,
                new_admin_role_id,
                tenant_record.tenant_id,
                tenant_record.created_by,
                true
            ) ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;
        END LOOP;
        
        RAISE NOTICE 'Created admin role % for tenant %', new_admin_role_id, tenant_record.tenant_id;
    END LOOP;
END $$;

-- Update the tenant creation function to integrate with unified roles
CREATE OR REPLACE FUNCTION public.setup_tenant_admin_with_unified_roles(tenant_id_param uuid, admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_role_id uuid;
BEGIN
  -- Create or get admin role for this tenant
  SELECT id INTO admin_role_id 
  FROM user_roles 
  WHERE tenant_id = tenant_id_param 
    AND name = 'Administrator' 
    AND is_active = true;
    
  -- If no admin role exists, create one
  IF admin_role_id IS NULL THEN
    admin_role_id := create_initial_admin_role(tenant_id_param, admin_user_id);
  ELSE
    -- Assign existing admin role to the user
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
    ) ON CONFLICT (user_id, role_id) DO UPDATE SET 
      is_active = true,
      assigned_at = now();
  END IF;
  
  -- Ensure tenant_users entry exists
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    is_active,
    invitation_status,
    created_at
  ) VALUES (
    tenant_id_param,
    admin_user_id,
    'admin',
    true,
    'accepted',
    now()
  ) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
    is_active = true,
    invitation_status = 'accepted',
    role = 'admin';
    
  -- Log the integration
  INSERT INTO user_activity_logs (
    tenant_id,
    user_id,
    action_type,
    resource_type,
    details
  ) VALUES (
    tenant_id_param,
    admin_user_id,
    'unified_role_integration',
    'tenant_setup',
    jsonb_build_object(
      'admin_role_id', admin_role_id,
      'integrated_at', now()
    )
  );
END;
$$;

-- Create trigger to automatically setup unified roles when tenant is created
CREATE OR REPLACE FUNCTION public.auto_setup_tenant_admin_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set up unified role management for the tenant admin
  PERFORM setup_tenant_admin_with_unified_roles(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

-- Add trigger to tenants table if it doesn't exist
DROP TRIGGER IF EXISTS trigger_setup_tenant_admin_roles ON public.tenants;
CREATE TRIGGER trigger_setup_tenant_admin_roles
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_setup_tenant_admin_roles();