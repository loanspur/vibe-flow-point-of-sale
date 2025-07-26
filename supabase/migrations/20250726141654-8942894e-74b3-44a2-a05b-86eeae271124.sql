-- Fix remaining function search path issues (batch 5)

-- Fix setup_default_user_roles function
CREATE OR REPLACE FUNCTION public.setup_default_user_roles(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix setup_default_business_settings function
CREATE OR REPLACE FUNCTION public.setup_default_business_settings(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix handle_new_tenant function
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Setup default accounts
  PERFORM setup_default_accounts(NEW.id);
  
  -- Setup default features
  PERFORM setup_tenant_default_features(NEW.id);
  
  -- Setup default user roles
  PERFORM setup_default_user_roles(NEW.id);
  
  -- Setup default business settings
  PERFORM setup_default_business_settings(NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Fix setup_tenant_default_features function
CREATE OR REPLACE FUNCTION public.setup_tenant_default_features(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Fix auto_setup_tenant_accounts function
CREATE OR REPLACE FUNCTION public.auto_setup_tenant_accounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  -- Set up default accounts for this tenant if they don't exist
  PERFORM setup_default_accounts(NEW.id);
  RETURN NEW;
END;
$function$;

-- Fix trigger functions
CREATE OR REPLACE FUNCTION public.sync_profile_tenant_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When a profile is updated with a tenant_id, ensure tenant_users entry exists
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO tenant_users (tenant_id, user_id, role, is_active, created_at)
    VALUES (
      NEW.tenant_id,
      NEW.user_id,
      CASE 
        WHEN NEW.role = 'admin' THEN 'admin'
        WHEN NEW.role = 'manager' THEN 'manager'
        WHEN NEW.role = 'superadmin' THEN 'owner'
        ELSE 'user'
      END,
      true,
      now()
    )
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET
      role = CASE 
        WHEN NEW.role = 'admin' THEN 'admin'
        WHEN NEW.role = 'manager' THEN 'manager'
        WHEN NEW.role = 'superadmin' THEN 'owner'
        ELSE 'user'
      END,
      is_active = true,
      updated_at = now();
  END IF;
  
  -- When tenant_id is removed from profile, deactivate tenant_users entry
  IF OLD.tenant_id IS NOT NULL AND NEW.tenant_id IS NULL THEN
    UPDATE tenant_users 
    SET is_active = false, updated_at = now()
    WHERE user_id = NEW.user_id AND tenant_id = OLD.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$function$;