-- Enhanced Roles and Permissions System with System Features

-- Create enum types for better data consistency
DO $$ BEGIN
  CREATE TYPE feature_type AS ENUM ('core', 'premium', 'enterprise', 'addon');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE feature_status AS ENUM ('active', 'inactive', 'deprecated', 'beta');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- System Features Table - Defines available features in the system
CREATE TABLE IF NOT EXISTS public.system_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  feature_type feature_type NOT NULL DEFAULT 'core',
  status feature_status NOT NULL DEFAULT 'active',
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT,
  requires_subscription BOOLEAN DEFAULT false,
  min_plan_level TEXT,
  dependencies TEXT[], -- Array of feature names this depends on
  metadata JSONB DEFAULT '{}',
  is_system_feature BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Feature Sets - Predefined collections of features
CREATE TABLE IF NOT EXISTS public.feature_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  features TEXT[] NOT NULL, -- Array of feature names
  is_system_set BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tenant Feature Access - Which features are enabled for each tenant
CREATE TABLE IF NOT EXISTS public.tenant_feature_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  enabled_by UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, feature_name)
);

-- Enhanced User Roles with more metadata
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'level') THEN
    ALTER TABLE public.user_roles 
    ADD COLUMN level INTEGER DEFAULT 1,
    ADD COLUMN can_manage_users BOOLEAN DEFAULT false,
    ADD COLUMN can_manage_settings BOOLEAN DEFAULT false,
    ADD COLUMN can_view_reports BOOLEAN DEFAULT false,
    ADD COLUMN feature_set_id UUID,
    ADD COLUMN resource_limits JSONB DEFAULT '{}';
  END IF;
END $$;

-- Permission Templates - Predefined permission sets
CREATE TABLE IF NOT EXISTS public.permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_system_template BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Activity Permissions - Track what users can do
CREATE TABLE IF NOT EXISTS public.user_activity_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  is_allowed BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}', -- Conditions for permission (time, location, etc.)
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, tenant_id, resource, action)
);

-- Insert default system features
INSERT INTO public.system_features (name, display_name, description, feature_type, category, icon, requires_subscription) VALUES
('pos_basic', 'Basic POS', 'Basic point of sale functionality', 'core', 'pos', 'ShoppingCart', false),
('pos_advanced', 'Advanced POS', 'Advanced POS with promotions and discounts', 'premium', 'pos', 'ShoppingBag', true),
('inventory_management', 'Inventory Management', 'Stock tracking and management', 'core', 'inventory', 'Package', false),
('multi_location', 'Multi-Location', 'Support for multiple store locations', 'premium', 'business', 'MapPin', true),
('advanced_reporting', 'Advanced Reporting', 'Detailed analytics and custom reports', 'premium', 'analytics', 'BarChart3', true),
('customer_management', 'Customer Management', 'Customer profiles and history', 'core', 'customers', 'Users', false),
('loyalty_program', 'Loyalty Program', 'Customer loyalty and rewards system', 'premium', 'customers', 'Gift', true),
('accounting_integration', 'Accounting Integration', 'Advanced accounting features', 'enterprise', 'accounting', 'Calculator', true),
('api_access', 'API Access', 'REST API for integrations', 'premium', 'integrations', 'Link', true),
('custom_branding', 'Custom Branding', 'White-label and custom branding', 'enterprise', 'branding', 'Palette', true),
('user_management', 'User Management', 'Staff user management and roles', 'core', 'users', 'UserCog', false),
('backup_restore', 'Backup & Restore', 'Data backup and restore capabilities', 'premium', 'data', 'Database', true),
('webhooks', 'Webhooks', 'Real-time webhook notifications', 'premium', 'integrations', 'Webhook', true),
('mobile_app', 'Mobile App Access', 'Mobile application access', 'premium', 'mobile', 'Smartphone', true)
ON CONFLICT (name) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = now();

-- Insert feature sets
INSERT INTO public.feature_sets (name, display_name, description, features) VALUES
('starter', 'Starter Package', 'Basic features for small businesses', 
 ARRAY['pos_basic', 'inventory_management', 'customer_management', 'user_management']),
('professional', 'Professional Package', 'Advanced features for growing businesses',
 ARRAY['pos_basic', 'pos_advanced', 'inventory_management', 'customer_management', 'user_management', 'advanced_reporting', 'loyalty_program', 'api_access']),
('enterprise', 'Enterprise Package', 'Full feature set for large organizations',
 ARRAY['pos_basic', 'pos_advanced', 'inventory_management', 'multi_location', 'customer_management', 'user_management', 'advanced_reporting', 'loyalty_program', 'accounting_integration', 'api_access', 'custom_branding', 'backup_restore', 'webhooks', 'mobile_app'])
ON CONFLICT (name) DO UPDATE SET 
  features = EXCLUDED.features,
  updated_at = now();

-- Insert permission templates
INSERT INTO public.permission_templates (name, description, category, template_data) VALUES
('admin_full', 'Full Administrator', 'admin', 
 '{"permissions": [{"resource": "*", "actions": ["*"]}, {"features": ["*"]}]}'),
('manager_standard', 'Standard Manager', 'manager',
 '{"permissions": [{"resource": "products", "actions": ["create", "read", "update"]}, {"resource": "sales", "actions": ["create", "read"]}, {"resource": "customers", "actions": ["create", "read", "update"]}, {"resource": "reports", "actions": ["read"]}]}'),
('cashier_basic', 'Basic Cashier', 'cashier',
 '{"permissions": [{"resource": "sales", "actions": ["create", "read"]}, {"resource": "products", "actions": ["read"]}, {"resource": "customers", "actions": ["read", "create"]}]}'),
('viewer_readonly', 'Read-Only Access', 'viewer',
 '{"permissions": [{"resource": "sales", "actions": ["read"]}, {"resource": "products", "actions": ["read"]}, {"resource": "customers", "actions": ["read"]}, {"resource": "reports", "actions": ["read"]}]}')
ON CONFLICT (name) DO UPDATE SET 
  template_data = EXCLUDED.template_data,
  updated_at = now();