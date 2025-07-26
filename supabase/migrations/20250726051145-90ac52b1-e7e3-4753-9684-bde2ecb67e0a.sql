-- Fix trial signup flow: Add missing features and ensure proper setup

-- 1. Ensure default tenant feature access is set up for new tenants
CREATE OR REPLACE FUNCTION public.setup_tenant_default_features(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Enable essential features for new tenants
  INSERT INTO public.tenant_feature_access (tenant_id, feature_name, is_enabled)
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
$$;

-- 2. Ensure system features exist for basic functionality (using correct column names)
INSERT INTO public.system_features (name, display_name, description, category, feature_type, status, is_system_feature)
VALUES 
  ('basic_pos', 'Basic POS System', 'Core point of sale functionality', 'core', 'core', 'active', true),
  ('product_management', 'Product Management', 'Add, edit, and manage products', 'core', 'core', 'active', true),
  ('customer_management', 'Customer Management', 'Manage customer information', 'core', 'core', 'active', true),
  ('sales_reporting', 'Sales Reporting', 'Basic sales reports and analytics', 'reporting', 'premium', 'active', true),
  ('inventory_tracking', 'Inventory Tracking', 'Track product stock levels', 'inventory', 'core', 'active', true),
  ('user_management', 'User Management', 'Manage team members and roles', 'admin', 'core', 'active', true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = now();

-- 3. Create default user roles for tenants
CREATE OR REPLACE FUNCTION public.setup_default_user_roles(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_role_id uuid;
  manager_role_id uuid;
  cashier_role_id uuid;
BEGIN
  -- Create Admin role
  INSERT INTO public.user_roles (tenant_id, name, description, is_system_role, is_active, is_editable)
  VALUES (tenant_id_param, 'Admin', 'Full system access and administration', true, true, false)
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO admin_role_id;
  
  -- Create Manager role
  INSERT INTO public.user_roles (tenant_id, name, description, is_system_role, is_active, is_editable)
  VALUES (tenant_id_param, 'Manager', 'Management access with reporting capabilities', true, true, false)
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO manager_role_id;
  
  -- Create Cashier role
  INSERT INTO public.user_roles (tenant_id, name, description, is_system_role, is_active, is_editable)
  VALUES (tenant_id_param, 'Cashier', 'Point of sale and basic operations', true, true, false)
  ON CONFLICT (tenant_id, name) DO NOTHING
  RETURNING id INTO cashier_role_id;
  
END;
$$;

-- 4. Ensure business_settings are created for new tenants
CREATE OR REPLACE FUNCTION public.setup_default_business_settings(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.business_settings (tenant_id, company_name, currency_code, currency_symbol, timezone, date_format)
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
$$;

-- 5. Update the comprehensive tenant setup function
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- 6. Create the trigger (drop and recreate to ensure it's updated)
DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tenant();

-- 7. Ensure auto_setup_tenant_accounts trigger still exists and works
DROP TRIGGER IF EXISTS auto_setup_tenant_accounts ON public.tenants;
CREATE TRIGGER auto_setup_tenant_accounts
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_setup_tenant_accounts();