-- Remove hard-coded system roles for dummy tenants
DELETE FROM user_roles 
WHERE tenant_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222', 
  '33333333-3333-3333-3333-333333333333'
) AND is_system_role = true;

-- Remove any remaining system roles with generic names
DELETE FROM user_roles 
WHERE is_system_role = true 
AND name IN ('Admin', 'Manager', 'Cashier', 'Administrator');

-- Update the setup_default_user_roles function to create proper tenant-specific roles
CREATE OR REPLACE FUNCTION public.setup_default_user_roles(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_role_id uuid;
  manager_role_id uuid;
  cashier_role_id uuid;
BEGIN
  -- Create Owner/Admin role
  INSERT INTO user_roles (
    tenant_id, 
    name, 
    description, 
    is_system_role, 
    is_active, 
    is_editable,
    permissions,
    level,
    color
  )
  VALUES (
    tenant_id_param, 
    'Business Owner', 
    'Complete business management access', 
    true, 
    true, 
    false,
    jsonb_build_object('all', true),
    1,
    '#dc2626'
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;
  
  -- Create Manager role
  INSERT INTO user_roles (
    tenant_id, 
    name, 
    description, 
    is_system_role, 
    is_active, 
    is_editable,
    permissions,
    level,
    color
  )
  VALUES (
    tenant_id_param, 
    'Store Manager', 
    'Manage operations, reports, and staff', 
    true, 
    true, 
    false,
    jsonb_build_object(
      'products', jsonb_build_object('read', true, 'write', true),
      'sales', jsonb_build_object('read', true, 'write', true),
      'reports', jsonb_build_object('read', true),
      'customers', jsonb_build_object('read', true, 'write', true),
      'inventory', jsonb_build_object('read', true, 'write', true)
    ),
    2,
    '#2563eb'
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;
  
  -- Create Sales Staff role
  INSERT INTO user_roles (
    tenant_id, 
    name, 
    description, 
    is_system_role, 
    is_active, 
    is_editable,
    permissions,
    level,
    color
  )
  VALUES (
    tenant_id_param, 
    'Sales Staff', 
    'Handle sales transactions and customers', 
    true, 
    true, 
    false,
    jsonb_build_object(
      'sales', jsonb_build_object('read', true, 'write', true),
      'customers', jsonb_build_object('read', true, 'write', true),
      'products', jsonb_build_object('read', true)
    ),
    3,
    '#059669'
  )
  ON CONFLICT (tenant_id, name) DO NOTHING;
  
END;
$function$;