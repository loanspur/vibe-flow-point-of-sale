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

-- 2. Create trigger to auto-setup features when tenant is created
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
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tenant();

-- 3. Ensure system features exist for basic functionality
INSERT INTO public.system_features (name, display_name, description, category, is_enabled_by_default)
VALUES 
  ('basic_pos', 'Basic POS System', 'Core point of sale functionality', 'core', true),
  ('product_management', 'Product Management', 'Add, edit, and manage products', 'core', true),
  ('customer_management', 'Customer Management', 'Manage customer information', 'core', true),
  ('sales_reporting', 'Sales Reporting', 'Basic sales reports and analytics', 'reporting', true),
  ('inventory_tracking', 'Inventory Tracking', 'Track product stock levels', 'inventory', true),
  ('user_management', 'User Management', 'Manage team members and roles', 'admin', true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = now();

-- 4. Create default user roles for tenants
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
  RETURNING id INTO admin_role_id;
  
  -- Create Manager role
  INSERT INTO public.user_roles (tenant_id, name, description, is_system_role, is_active, is_editable)
  VALUES (tenant_id_param, 'Manager', 'Management access with reporting capabilities', true, true, false)
  RETURNING id INTO manager_role_id;
  
  -- Create Cashier role
  INSERT INTO public.user_roles (tenant_id, name, description, is_system_role, is_active, is_editable)
  VALUES (tenant_id_param, 'Cashier', 'Point of sale and basic operations', true, true, false)
  RETURNING id INTO cashier_role_id;
  
  -- Note: Role permissions would be set up separately based on system permissions
END;
$$;

-- 5. Update the tenant creation trigger to include role setup
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
  
  RETURN NEW;
END;
$$;

-- 6. Ensure business_settings are created for new tenants
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

-- 7. Update the comprehensive tenant setup function
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