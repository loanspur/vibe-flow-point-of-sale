-- Create default roles for all tenants
CREATE OR REPLACE FUNCTION public.create_default_tenant_roles(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role_id uuid;
  manager_role_id uuid;
  cashier_role_id uuid;
  user_role_id uuid;
BEGIN
  -- Create Administrator role (highest level)
  INSERT INTO user_roles (
    tenant_id, name, description, level, color, is_system_role, is_active, is_editable,
    can_manage_users, can_manage_settings, can_view_reports, created_by
  ) VALUES (
    tenant_id_param, 'Administrator', 'Full system access with all privileges', 1, '#dc2626', true, true, false,
    true, true, true, auth.uid()
  ) RETURNING id INTO admin_role_id;

  -- Create Manager role
  INSERT INTO user_roles (
    tenant_id, name, description, level, color, is_system_role, is_active, is_editable,
    can_manage_users, can_manage_settings, can_view_reports, created_by
  ) VALUES (
    tenant_id_param, 'Manager', 'Manage sales, inventory, and team members', 2, '#2563eb', true, true, false,
    true, false, true, auth.uid()
  ) RETURNING id INTO manager_role_id;

  -- Create Cashier role
  INSERT INTO user_roles (
    tenant_id, name, description, level, color, is_system_role, is_active, is_editable,
    can_manage_users, can_manage_settings, can_view_reports, created_by
  ) VALUES (
    tenant_id_param, 'Cashier', 'Process sales and manage customer interactions', 3, '#059669', true, true, false,
    false, false, false, auth.uid()
  ) RETURNING id INTO cashier_role_id;

  -- Create User role (basic access)
  INSERT INTO user_roles (
    tenant_id, name, description, level, color, is_system_role, is_active, is_editable,
    can_manage_users, can_manage_settings, can_view_reports, created_by
  ) VALUES (
    tenant_id_param, 'User', 'Basic system access for viewing and basic operations', 4, '#6b7280', true, true, false,
    false, false, false, auth.uid()
  ) RETURNING id INTO user_role_id;

  -- Grant permissions to each role
  PERFORM grant_role_permissions(admin_role_id, 'all');
  PERFORM grant_role_permissions(manager_role_id, 'manager');
  PERFORM grant_role_permissions(cashier_role_id, 'cashier');
  PERFORM grant_role_permissions(user_role_id, 'user');
END;
$$;

-- Function to grant role permissions
CREATE OR REPLACE FUNCTION public.grant_role_permissions(role_id_param uuid, permission_set text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF permission_set = 'all' THEN
    -- Grant all permissions to admin
    INSERT INTO role_permissions (role_id, permission_id, granted)
    SELECT role_id_param, id, true FROM system_permissions
    ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true;
  ELSIF permission_set = 'manager' THEN
    -- Grant manager permissions
    INSERT INTO role_permissions (role_id, permission_id, granted)
    SELECT role_id_param, id, true FROM system_permissions
    WHERE category IN ('dashboard', 'sales', 'inventory', 'customers', 'reports', 'pos')
    AND name NOT LIKE '%delete%'
    ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true;
  ELSIF permission_set = 'cashier' THEN
    -- Grant cashier permissions (FIXED: Added 'pos' category)
    INSERT INTO role_permissions (role_id, permission_id, granted)
    SELECT role_id_param, id, true FROM system_permissions
    WHERE category IN ('dashboard', 'sales', 'customers', 'pos')
    AND name NOT IN ('delete_sales', 'manage_users', 'manage_settings', 'Transfer Cash')
    ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true;
  ELSIF permission_set = 'user' THEN
    -- Grant basic user permissions
    INSERT INTO role_permissions (role_id, permission_id, granted)
    SELECT role_id_param, id, true FROM system_permissions
    WHERE category IN ('dashboard')
    AND name IN ('view_dashboard', 'view_products', 'view_customers')
    ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true;
  END IF;
END;
$$;

-- Update the cashier role description to be more accurate
UPDATE user_roles 
SET description = 'Process sales, manage cash drawers, and handle customer interactions'
WHERE name = 'Cashier' AND is_active = true;
