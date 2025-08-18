-- Create a comprehensive Administrator role for the Traction Energies tenant
-- First, check if an Administrator role already exists
DO $$
DECLARE
    traction_tenant_id uuid;
    admin_role_id uuid;
    permission_record RECORD;
BEGIN
    -- Get the Traction Energies tenant ID
    SELECT id INTO traction_tenant_id 
    FROM tenants 
    WHERE name = 'traction energies' 
    LIMIT 1;
    
    IF traction_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Traction Energies tenant not found';
    END IF;
    
    -- Check if Administrator role already exists for this tenant
    SELECT id INTO admin_role_id
    FROM user_roles
    WHERE tenant_id = traction_tenant_id 
    AND name = 'Administrator'
    AND is_active = true;
    
    -- If Administrator role doesn't exist, create it
    IF admin_role_id IS NULL THEN
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
            can_view_reports
        ) VALUES (
            traction_tenant_id,
            'Administrator',
            'Full system access with all privileges for tenant administration',
            false, -- Not a system role, can be edited
            true,
            true,
            jsonb_build_object('all', true), -- Full permissions
            1, -- Highest level
            '#dc2626', -- Red color for admin
            true,
            true,
            true
        ) RETURNING id INTO admin_role_id;
    ELSE
        -- Update existing Administrator role to ensure it has full privileges
        UPDATE user_roles
        SET 
            description = 'Full system access with all privileges for tenant administration',
            permissions = jsonb_build_object('all', true),
            level = 1,
            color = '#dc2626',
            can_manage_users = true,
            can_manage_settings = true,
            can_view_reports = true,
            is_active = true,
            is_editable = true,
            updated_at = now()
        WHERE id = admin_role_id;
    END IF;
    
    -- Clear existing role permissions to start fresh
    DELETE FROM role_permissions WHERE role_id = admin_role_id;
    
    -- Grant ALL system permissions to the Administrator role
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
    
    -- Log the operation
    RAISE NOTICE 'Administrator role created/updated for tenant % with % permissions', 
        traction_tenant_id, 
        (SELECT COUNT(*) FROM system_permissions);
END $$;