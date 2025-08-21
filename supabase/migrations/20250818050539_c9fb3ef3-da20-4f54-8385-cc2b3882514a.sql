-- Create a comprehensive Administrator role for the Traction Energies tenant
DO $$
DECLARE
    traction_tenant_id uuid := '6742eb8a-434e-4c14-a91c-6d55adeb5750'; -- Direct tenant ID
    admin_role_id uuid;
    permission_record RECORD;
    permission_count integer := 0;
BEGIN
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
        
        RAISE NOTICE 'Created new Administrator role with ID: %', admin_role_id;
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
        
        RAISE NOTICE 'Updated existing Administrator role with ID: %', admin_role_id;
    END IF;
    
    -- Clear existing role permissions to start fresh
    DELETE FROM role_permissions WHERE role_id = admin_role_id;
    
    -- Grant ALL system permissions to the Administrator role
    FOR permission_record IN 
        SELECT id FROM system_permissions ORDER BY category, resource, action
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
        permission_count := permission_count + 1;
    END LOOP;
    
    -- Log the operation
    RAISE NOTICE 'Administrator role setup complete. Granted % permissions to role %', 
        permission_count, admin_role_id;
END $$;