-- Add RLS Policies and Default Data for Enhanced RBAC System

-- RLS Policies for system_features
CREATE POLICY "System features are viewable by all authenticated users" ON public.system_features
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only superadmins can manage system features" ON public.system_features
  FOR ALL USING (get_current_user_role() = 'superadmin');

-- RLS Policies for feature_sets
CREATE POLICY "Feature sets are viewable by all authenticated users" ON public.feature_sets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only superadmins can manage feature sets" ON public.feature_sets
  FOR ALL USING (get_current_user_role() = 'superadmin');

-- RLS Policies for tenant_feature_access
CREATE POLICY "Users can view their tenant's feature access" ON public.tenant_feature_access
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant admins can manage their tenant's feature access" ON public.tenant_feature_access
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND 
    (get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
  );

-- RLS Policies for permission_templates
CREATE POLICY "Users can view permission templates" ON public.permission_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Tenant admins can manage custom permission templates" ON public.permission_templates
  FOR ALL USING (
    (is_system_template = false AND created_by = auth.uid()) OR
    get_current_user_role() = 'superadmin'
  );

-- RLS Policies for user_activity_permissions
CREATE POLICY "Users can view their own activity permissions" ON public.user_activity_permissions
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role]))
  );

CREATE POLICY "Tenant admins can manage user activity permissions" ON public.user_activity_permissions
  FOR ALL USING (
    tenant_id = get_user_tenant_id() AND 
    get_current_user_role() = ANY (ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
  );

-- Helper functions for permission checking
CREATE OR REPLACE FUNCTION public.user_has_feature_access(user_tenant_id UUID, feature_name_param TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_feature_access
    WHERE tenant_id = user_tenant_id 
      AND feature_name = feature_name_param 
      AND is_enabled = true
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_feature_access(user_tenant_id UUID)
RETURNS TABLE(feature_name TEXT, is_enabled BOOLEAN, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tfa.feature_name, tfa.is_enabled, tfa.expires_at
  FROM public.tenant_feature_access tfa
  WHERE tfa.tenant_id = user_tenant_id;
$$;

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

-- Add triggers for timestamp updates
CREATE TRIGGER update_system_features_updated_at BEFORE UPDATE ON public.system_features FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_feature_sets_updated_at BEFORE UPDATE ON public.feature_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenant_feature_access_updated_at BEFORE UPDATE ON public.tenant_feature_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permission_templates_updated_at BEFORE UPDATE ON public.permission_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_activity_permissions_updated_at BEFORE UPDATE ON public.user_activity_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();