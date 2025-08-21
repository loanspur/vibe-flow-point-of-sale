-- Enhanced Permission System Implementation (Fixed)

-- Insert comprehensive permissions (without ON CONFLICT for now)
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'View Product Brands', 'View and browse product brands', 'brands', 'read', 'inventory', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'brands' AND action = 'read');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Manage Product Brands', 'Create and manage product brands', 'brands', 'manage', 'inventory', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'brands' AND action = 'manage');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'View Product Units', 'View units of measurement', 'units', 'read', 'inventory', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'units' AND action = 'read');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Manage Product Units', 'Create and manage units of measurement', 'units', 'manage', 'inventory', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'units' AND action = 'manage');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'View Stock Levels', 'View current stock levels', 'stock_levels', 'read', 'inventory', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'stock_levels' AND action = 'read');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Adjust Stock Levels', 'Make stock adjustments', 'stock_levels', 'update', 'inventory', true
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'stock_levels' AND action = 'update');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Transfer Stock', 'Transfer stock between locations', 'stock_transfers', 'transfer', 'inventory', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'stock_transfers' AND action = 'transfer');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Receive Stock', 'Receive purchased inventory', 'stock_receiving', 'create', 'inventory', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'stock_receiving' AND action = 'create');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Process Sales Transactions', 'Process POS and sales transactions', 'sales', 'process', 'sales', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'sales' AND action = 'process');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'View Cash Drawers', 'View cash drawer information', 'cash_drawers', 'read', 'pos', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'cash_drawers' AND action = 'read');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Open Cash Drawers', 'Open and initialize cash drawers', 'cash_drawers', 'create', 'pos', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'cash_drawers' AND action = 'create');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Close Cash Drawers', 'Close and reconcile cash drawers', 'cash_drawers', 'update', 'pos', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'cash_drawers' AND action = 'update');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Manage Cash Transactions', 'Record cash in/out transactions', 'cash_transactions', 'create', 'pos', false
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'cash_transactions' AND action = 'create');

INSERT INTO system_permissions (name, description, resource, action, category, is_critical) 
SELECT 'Transfer Cash', 'Transfer cash between drawers', 'cash_transfers', 'transfer', 'pos', true
WHERE NOT EXISTS (SELECT 1 FROM system_permissions WHERE resource = 'cash_transfers' AND action = 'transfer');

-- Create permission groups table for bulk management
CREATE TABLE IF NOT EXISTS permission_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  category text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_system_group boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on permission_groups
ALTER TABLE permission_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for permission_groups (drop existing first)
DROP POLICY IF EXISTS "Public can view system permission groups" ON permission_groups;
DROP POLICY IF EXISTS "Admins can manage custom permission groups" ON permission_groups;

CREATE POLICY "Public can view system permission groups"
ON permission_groups FOR SELECT
USING (is_system_group = true);

CREATE POLICY "Admins can manage custom permission groups"
ON permission_groups FOR ALL
USING (NOT is_system_group OR get_current_user_role() = 'superadmin');

-- Create enhanced permission checking function with proper search path
CREATE OR REPLACE FUNCTION check_user_permission_enhanced(
  p_user_id uuid,
  p_resource text,
  p_action text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_permission boolean := false;
  user_role_name text;
BEGIN
  -- Check if user is superadmin (bypass all checks)
  SELECT role INTO user_role_name 
  FROM profiles 
  WHERE user_id = p_user_id;
  
  IF user_role_name IN ('superadmin', 'admin') THEN
    RETURN true;
  END IF;
  
  -- Check specific permission through role assignments
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN role_permissions rp ON ura.role_id = rp.role_id
    JOIN system_permissions sp ON rp.permission_id = sp.id
    WHERE ura.user_id = p_user_id
      AND ura.is_active = true
      AND rp.granted = true
      AND sp.resource::text = p_resource
      AND sp.action::text = p_action
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;

-- Create function to get user-friendly permission error messages with proper search path
CREATE OR REPLACE FUNCTION get_permission_error_message(
  p_resource text,
  p_action text,
  p_user_role text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  feature_name text;
  action_desc text;
  error_message text;
BEGIN
  -- Map resource to user-friendly names
  feature_name := CASE p_resource
    WHEN 'products' THEN 'Product Management'
    WHEN 'sales' THEN 'Sales Processing'
    WHEN 'purchases' THEN 'Purchase Management'
    WHEN 'accounting' THEN 'Accounting'
    WHEN 'reports' THEN 'Reports and Analytics'
    WHEN 'business_settings' THEN 'Business Settings'
    WHEN 'user_management' THEN 'User Management'
    WHEN 'email_notifications' THEN 'Email Communications'
    WHEN 'cash_drawers' THEN 'Cash Management'
    ELSE INITCAP(REPLACE(p_resource, '_', ' '))
  END;
  
  -- Map action to user-friendly descriptions
  action_desc := CASE p_action
    WHEN 'create' THEN 'add new items'
    WHEN 'update' THEN 'modify existing items'
    WHEN 'delete' THEN 'remove items'
    WHEN 'read' THEN 'view'
    WHEN 'manage' THEN 'fully manage'
    WHEN 'process' THEN 'process transactions'
    WHEN 'configure' THEN 'configure settings'
    ELSE p_action
  END;
  
  -- Create user-friendly error message
  error_message := 'Access denied: You don''t have permission to ' || action_desc || ' in ' || feature_name || '.';
  
  IF p_user_role IS NOT NULL THEN
    error_message := error_message || ' Your current role (' || p_user_role || ') doesn''t include this permission.';
  END IF;
  
  error_message := error_message || ' Please contact your administrator to request access.';
  
  RETURN error_message;
END;
$$;