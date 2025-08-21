-- Enhanced Permission System with Comprehensive Coverage

-- First, add new enum values for permission_resource if needed
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'brands';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'units';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'stock_levels';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'stock_transfers';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'stock_receiving';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'communication_settings';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'cash_drawers';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'cash_transactions';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'cash_transfers';
ALTER TYPE permission_resource ADD VALUE IF NOT EXISTS 'pricing_rules';

-- Add new enum values for permission_action if needed
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'manage';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'process';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'transfer';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'reconcile';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'export';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'import';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'configure';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'send';
ALTER TYPE permission_action ADD VALUE IF NOT EXISTS 'schedule';

-- Insert comprehensive permissions using correct enum values
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
-- Enhanced Products Management
('View Product Brands', 'View and browse product brands', 'brands', 'read', 'inventory', false),
('Manage Product Brands', 'Create and manage product brands', 'brands', 'manage', 'inventory', false),
('View Product Units', 'View units of measurement', 'units', 'read', 'inventory', false),
('Manage Product Units', 'Create and manage units of measurement', 'units', 'manage', 'inventory', false),
('View Stock Levels', 'View current stock levels', 'stock_levels', 'read', 'inventory', false),
('Adjust Stock Levels', 'Make stock adjustments', 'stock_levels', 'update', 'inventory', true),
('Transfer Stock', 'Transfer stock between locations', 'stock_transfers', 'transfer', 'inventory', false),
('Receive Stock', 'Receive purchased inventory', 'stock_receiving', 'create', 'inventory', false),

-- Enhanced Sales Management  
('Process Sales Transactions', 'Process POS and sales transactions', 'sales', 'process', 'sales', false),
('Apply Sale Discounts', 'Apply discounts to sales', 'discount_management', 'create', 'sales', false),
('Manage Sale Discounts', 'Create and manage discount rules', 'discount_management', 'manage', 'sales', false),

-- Enhanced Purchasing
('Process Purchase Orders', 'Process and approve purchase orders', 'purchases', 'process', 'purchasing', false),
('Receive Purchase Deliveries', 'Receive and process deliveries', 'purchases', 'update', 'purchasing', false),

-- Enhanced Financial Management
('Reconcile Accounts', 'Perform account reconciliation', 'accounting', 'reconcile', 'financial', true),
('Process Payments', 'Record and process payments', 'accounts_receivable', 'update', 'financial', false),
('Manage Payables', 'Manage supplier payments', 'accounts_payable', 'manage', 'financial', false),
('Export Financial Data', 'Export financial reports and data', 'financial_reports', 'export', 'financial', false),

-- Communication Management
('Configure Email Settings', 'Configure SMTP and email settings', 'email_notifications', 'configure', 'communication', true),
('Configure SMS Settings', 'Configure SMS provider settings', 'sms_notifications', 'configure', 'communication', true),
('Configure WhatsApp Settings', 'Configure WhatsApp API settings', 'whatsapp_notifications', 'configure', 'communication', true),
('Send Bulk Communications', 'Send bulk messages to customers', 'email_notifications', 'send', 'communication', false),

-- Enhanced Business Settings
('Configure Tax Settings', 'Configure tax rates and policies', 'tax_settings', 'configure', 'settings', true),
('Configure POS System', 'Configure point-of-sale settings', 'pos_system', 'configure', 'settings', true),
('Manage Payment Methods', 'Configure accepted payment methods', 'payment_methods', 'manage', 'settings', false),
('Configure Locations', 'Manage store locations and warehouses', 'location_management', 'configure', 'settings', true),

-- Cash Management
('View Cash Drawers', 'View cash drawer information', 'cash_drawers', 'read', 'pos', false),
('Open Cash Drawers', 'Open and initialize cash drawers', 'cash_drawers', 'create', 'pos', false),
('Close Cash Drawers', 'Close and reconcile cash drawers', 'cash_drawers', 'update', 'pos', false),
('Manage Cash Transactions', 'Record cash in/out transactions', 'cash_transactions', 'create', 'pos', false),
('Transfer Cash', 'Transfer cash between drawers', 'cash_transfers', 'transfer', 'pos', true),

-- Advanced Reporting
('Export Reports', 'Export reports to various formats', 'reports', 'export', 'reports', false),
('Schedule Reports', 'Schedule automated report delivery', 'reports', 'schedule', 'reports', false),
('View Advanced Analytics', 'Access advanced analytics and insights', 'reports', 'read', 'reports', false),

-- Pricing Management
('View Pricing Rules', 'View pricing strategies and rules', 'pricing_rules', 'read', 'marketing', false),
('Manage Pricing Rules', 'Create and manage pricing strategies', 'pricing_rules', 'manage', 'marketing', false),

-- System Administration
('Import System Data', 'Import data from external sources', 'data_import_export', 'import', 'administration', true),
('Export System Data', 'Export system data for backup', 'data_import_export', 'export', 'administration', false),
('Manage System Backups', 'Create and manage system backups', 'system_backup', 'manage', 'administration', true),
('Configure API Access', 'Manage API keys and access', 'api_access', 'configure', 'administration', true)

ON CONFLICT (resource, action, category) DO NOTHING;

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

-- Create RLS policies for permission_groups
DROP POLICY IF EXISTS "Tenant users can view permission groups" ON permission_groups;
DROP POLICY IF EXISTS "Tenant admins can manage permission groups" ON permission_groups;

CREATE POLICY "Public can view system permission groups"
ON permission_groups FOR SELECT
USING (is_system_group = true);

CREATE POLICY "Admins can manage custom permission groups"
ON permission_groups FOR ALL
USING (NOT is_system_group OR get_current_user_role() = 'superadmin');

-- Insert permission groups for bulk management
INSERT INTO permission_groups (name, display_name, description, category, permissions, sort_order) VALUES
('inventory_viewer', 'Inventory - Viewer', 'Basic inventory viewing capabilities', 'inventory', 
 ARRAY['products:read', 'product_categories:read', 'stock_levels:read', 'brands:read', 'units:read'], 1),

('inventory_operator', 'Inventory - Operator', 'Standard inventory operations', 'inventory', 
 ARRAY['products:read', 'products:create', 'products:update', 'product_categories:read', 'stock_levels:read', 'stock_levels:update', 'stock_receiving:create'], 2),

('inventory_manager', 'Inventory - Manager', 'Full inventory management access', 'inventory', 
 ARRAY['products:*', 'product_categories:*', 'product_variants:*', 'stock_levels:*', 'stock_transfers:transfer', 'brands:*', 'units:*', 'inventory_management:*'], 3),

('sales_cashier', 'Sales - Cashier', 'Basic point-of-sale operations', 'sales', 
 ARRAY['sales:create', 'sales:read', 'sales:process', 'customers:read', 'discount_management:create', 'pos_system:read'], 1),

('sales_associate', 'Sales - Associate', 'Enhanced sales operations', 'sales', 
 ARRAY['sales:*', 'customers:*', 'quotes:create', 'quotes:read', 'quotes:update', 'discount_management:create', 'sale_returns:create'], 2),

('sales_manager', 'Sales - Manager', 'Complete sales management', 'sales', 
 ARRAY['sales:*', 'customers:*', 'quotes:*', 'sale_returns:*', 'discount_management:*', 'sales_reports:read', 'pos_system:*'], 3),

('purchasing_clerk', 'Purchasing - Clerk', 'Basic purchasing operations', 'purchasing', 
 ARRAY['purchases:read', 'purchases:create', 'suppliers:read', 'stock_receiving:create'], 1),

('purchasing_manager', 'Purchasing - Manager', 'Full purchasing management', 'purchasing', 
 ARRAY['purchases:*', 'suppliers:*', 'purchase_returns:*', 'inventory_reports:read'], 2),

('financial_clerk', 'Financial - Clerk', 'Basic financial operations', 'financial', 
 ARRAY['accounting:read', 'accounts_receivable:read', 'accounts_payable:read', 'financial_statements:read'], 1),

('financial_manager', 'Financial - Manager', 'Complete financial management', 'financial', 
 ARRAY['accounting:*', 'chart_of_accounts:*', 'financial_statements:*', 'accounts_receivable:*', 'accounts_payable:*', 'journal_entries:*'], 2),

('communications_user', 'Communications - User', 'Basic communication capabilities', 'communication', 
 ARRAY['email_notifications:read', 'email_notifications:send'], 1),

('communications_manager', 'Communications - Manager', 'Full communication management', 'communication', 
 ARRAY['email_notifications:*', 'sms_notifications:*', 'whatsapp_notifications:*'], 2),

('settings_viewer', 'Settings - Viewer', 'View business settings', 'settings', 
 ARRAY['business_settings:read', 'tax_settings:read', 'payment_methods:read', 'location_management:read'], 1),

('settings_administrator', 'Settings - Administrator', 'Full settings management', 'settings', 
 ARRAY['business_settings:*', 'tax_settings:*', 'payment_methods:*', 'location_management:*', 'pos_system:*'], 2),

('reports_user', 'Reports - User', 'Basic reporting access', 'reports', 
 ARRAY['dashboard:read', 'sales_reports:read', 'inventory_reports:read', 'reports:read'], 1),

('reports_analyst', 'Reports - Analyst', 'Advanced reporting and analytics', 'reports', 
 ARRAY['dashboard:read', 'sales_reports:read', 'inventory_reports:read', 'financial_reports:read', 'reports:*'], 2),

('pos_operator', 'POS - Operator', 'Point-of-sale operations', 'pos', 
 ARRAY['pos_system:read', 'cashier_operations:*', 'cash_drawers:read', 'cash_drawers:create', 'cash_drawers:update'], 1),

('cash_manager', 'Cash - Manager', 'Cash and drawer management', 'pos', 
 ARRAY['cash_drawers:*', 'cash_transactions:*', 'cash_transfers:transfer', 'cashier_operations:*'], 2)

ON CONFLICT (name) DO NOTHING;

-- Create enhanced permission checking function
CREATE OR REPLACE FUNCTION check_user_permission_enhanced(
  p_user_id uuid,
  p_resource text,
  p_action text DEFAULT 'read'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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

-- Create function to get user-friendly permission error messages
CREATE OR REPLACE FUNCTION get_permission_error_message(
  p_resource text,
  p_action text,
  p_user_role text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_permissions_category_resource ON system_permissions(category, resource);
CREATE INDEX IF NOT EXISTS idx_system_permissions_resource_action ON system_permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_granted ON role_permissions(role_id, granted);
CREATE INDEX IF NOT EXISTS idx_permission_groups_category_sort ON permission_groups(category, sort_order);