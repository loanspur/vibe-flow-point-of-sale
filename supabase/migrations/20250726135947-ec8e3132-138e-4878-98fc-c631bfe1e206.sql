-- Continue fixing more functions - focusing on frequently used ones

-- Fix feature and setup functions
CREATE OR REPLACE FUNCTION public.setup_tenant_default_features(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Enable essential features for new tenants
  INSERT INTO tenant_feature_access (tenant_id, feature_name, is_enabled)
  VALUES 
    (tenant_id_param, 'basic_pos', true),
    (tenant_id_param, 'product_management', true),
    (tenant_id_param, 'customer_management', true),
    (tenant_id_param, 'sales_reporting', true),
    (tenant_id_param, 'inventory_tracking', true),
    (tenant_id_param, 'user_management', true)
  ON CONFLICT (tenant_id, feature_name) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    updated_at = now();
END;
$function$;

-- Fix setup default user roles
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
  -- Create Admin role
  INSERT INTO user_roles (tenant_id, name, description, is_system_role, is_active, is_editable)
  VALUES (tenant_id_param, 'Admin', 'Full system access and administration', true, true, false)
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO admin_role_id;
  
  -- Create Manager role
  INSERT INTO user_roles (tenant_id, name, description, is_system_role, is_active, is_editable)
  VALUES (tenant_id_param, 'Manager', 'Management access with reporting capabilities', true, true, false)
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO manager_role_id;
  
  -- Create Cashier role
  INSERT INTO user_roles (tenant_id, name, description, is_system_role, is_active, is_editable)
  VALUES (tenant_id_param, 'Cashier', 'Point of sale and basic operations', true, true, false)
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO cashier_role_id;
  
END;
$function$;

-- Fix setup default business settings
CREATE OR REPLACE FUNCTION public.setup_default_business_settings(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO business_settings (tenant_id, company_name, currency_code, currency_symbol, timezone, date_format)
  VALUES (
    tenant_id_param,
    'New Business',
    'KES',
    'KES',
    'Africa/Nairobi',
    'DD/MM/YYYY'
  )
  ON CONFLICT (tenant_id) DO NOTHING;
END;
$function$;

-- Fix user permission functions
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id_param uuid, resource_param permission_resource, action_param permission_action)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM role_permissions rp
        JOIN user_role_assignments ura ON rp.role_id = ura.role_id
        JOIN system_permissions sp ON rp.permission_id = sp.id
        WHERE ura.user_id = user_id_param
        AND ura.is_active = true
        AND sp.resource = resource_param
        AND sp.action = action_param
        AND rp.granted = true
    );
$function$;