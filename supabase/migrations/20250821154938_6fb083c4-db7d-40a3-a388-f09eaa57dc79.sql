-- Comprehensive Permission System Enhancement

-- First, let's create a comprehensive set of permissions for all system features
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
-- Products Management
('View Products', 'View product catalog and inventory', 'products', 'read', 'inventory', false),
('Create Products', 'Add new products to catalog', 'products', 'create', 'inventory', false),
('Edit Products', 'Modify existing products', 'products', 'update', 'inventory', true),
('Delete Products', 'Remove products from catalog', 'products', 'delete', 'inventory', true),
('Manage Product Categories', 'Create and manage product categories', 'product_categories', 'manage', 'inventory', false),
('Manage Product Units', 'Create and manage units of measurement', 'product_units', 'manage', 'inventory', false),
('Manage Brands', 'Create and manage product brands', 'brands', 'manage', 'inventory', false),
('View Stock Levels', 'View current stock levels', 'stock_levels', 'read', 'inventory', false),
('Adjust Stock', 'Make stock adjustments', 'stock_adjustments', 'create', 'inventory', true),
('Transfer Stock', 'Transfer stock between locations', 'stock_transfers', 'create', 'inventory', false),
('Receive Stock', 'Receive purchased inventory', 'stock_receiving', 'create', 'inventory', false),
('Manage Product Variants', 'Create and manage product variants', 'product_variants', 'manage', 'inventory', false),

-- Sales Management
('View Sales', 'View sales transactions and history', 'sales', 'read', 'sales', false),
('Process Sales', 'Create and process sales transactions', 'sales', 'create', 'sales', false),
('Edit Sales', 'Modify sales transactions', 'sales', 'update', 'sales', true),
('Cancel Sales', 'Cancel or void sales transactions', 'sales', 'delete', 'sales', true),
('Apply Discounts', 'Apply discounts to sales', 'sales_discounts', 'create', 'sales', false),
('Process Returns', 'Handle product returns', 'sales_returns', 'create', 'sales', false),
('View Sales Reports', 'Access sales analytics and reports', 'sales_reports', 'read', 'reports', false),
('Manage Customers', 'Create and manage customer records', 'customers', 'manage', 'crm', false),
('View Customer History', 'View customer transaction history', 'customer_history', 'read', 'crm', false),
('Manage Quotes', 'Create and manage sales quotes', 'quotes', 'manage', 'sales', false),
('Convert Quotes', 'Convert quotes to sales', 'quote_conversion', 'create', 'sales', false),

-- Purchases Management
('View Purchases', 'View purchase orders and history', 'purchases', 'read', 'purchasing', false),
('Create Purchases', 'Create new purchase orders', 'purchases', 'create', 'purchasing', false),
('Edit Purchases', 'Modify purchase orders', 'purchases', 'update', 'purchasing', true),
('Cancel Purchases', 'Cancel purchase orders', 'purchases', 'delete', 'purchasing', true),
('Receive Purchases', 'Receive and process deliveries', 'purchase_receiving', 'create', 'purchasing', false),
('Manage Suppliers', 'Create and manage supplier records', 'suppliers', 'manage', 'purchasing', false),
('View Purchase Reports', 'Access purchasing analytics', 'purchase_reports', 'read', 'reports', false),
('Manage Purchase Returns', 'Handle returns to suppliers', 'purchase_returns', 'create', 'purchasing', false),

-- Accounting Module
('View Accounts', 'View chart of accounts', 'accounts', 'read', 'financial', false),
('Create Accounts', 'Add new accounting accounts', 'accounts', 'create', 'financial', true),
('Edit Accounts', 'Modify accounting accounts', 'accounts', 'update', 'financial', true),
('View Transactions', 'View accounting transactions', 'accounting_transactions', 'read', 'financial', false),
('Create Transactions', 'Create journal entries', 'accounting_transactions', 'create', 'financial', true),
('Post Transactions', 'Post transactions to ledger', 'transaction_posting', 'create', 'financial', true),
('View Financial Statements', 'Access P&L and balance sheets', 'financial_statements', 'read', 'financial', false),
('Manage Accounts Receivable', 'Manage customer invoices and payments', 'accounts_receivable', 'manage', 'financial', false),
('Manage Accounts Payable', 'Manage supplier bills and payments', 'accounts_payable', 'manage', 'financial', false),
('Process Payments', 'Record and process payments', 'payments', 'create', 'financial', false),
('Reconcile Accounts', 'Perform account reconciliation', 'account_reconciliation', 'create', 'financial', true),

-- Reports & Analytics
('View Dashboard', 'Access main dashboard', 'dashboard', 'read', 'reports', false),
('View Sales Reports', 'Access detailed sales reports', 'sales_analytics', 'read', 'reports', false),
('View Inventory Reports', 'Access inventory and stock reports', 'inventory_analytics', 'read', 'reports', false),
('View Financial Reports', 'Access financial reports and analysis', 'financial_analytics', 'read', 'reports', false),
('View Customer Reports', 'Access customer analytics', 'customer_analytics', 'read', 'reports', false),
('Export Reports', 'Export reports to various formats', 'report_export', 'create', 'reports', false),
('Schedule Reports', 'Schedule automated report delivery', 'report_scheduling', 'create', 'reports', false),

-- Communications Management
('View Communications', 'View communication history', 'communications', 'read', 'communication', false),
('Send Emails', 'Send email communications', 'email_communications', 'create', 'communication', false),
('Send SMS', 'Send SMS messages', 'sms_communications', 'create', 'communication', false),
('Send WhatsApp', 'Send WhatsApp messages', 'whatsapp_communications', 'create', 'communication', false),
('Manage Email Templates', 'Create and edit email templates', 'email_templates', 'manage', 'communication', false),
('Manage SMS Templates', 'Create and edit SMS templates', 'sms_templates', 'manage', 'communication', false),
('Manage WhatsApp Templates', 'Create and edit WhatsApp templates', 'whatsapp_templates', 'manage', 'communication', false),
('Configure Email Settings', 'Configure SMTP and email settings', 'email_settings', 'manage', 'communication', true),
('Configure SMS Settings', 'Configure SMS provider settings', 'sms_settings', 'manage', 'communication', true),
('Configure WhatsApp Settings', 'Configure WhatsApp API settings', 'whatsapp_settings', 'manage', 'communication', true),
('Bulk Messaging', 'Send bulk messages to customers', 'bulk_messaging', 'create', 'communication', false),

-- Business Settings (All Tabs)
('View Company Information', 'View company profile and details', 'company_info', 'read', 'settings', false),
('Edit Company Information', 'Modify company profile', 'company_info', 'update', 'settings', true),
('View Tax Settings', 'View tax configuration', 'tax_settings', 'read', 'settings', false),
('Edit Tax Settings', 'Modify tax rates and settings', 'tax_settings', 'update', 'settings', true),
('View Currency Settings', 'View currency configuration', 'currency_settings', 'read', 'settings', false),
('Edit Currency Settings', 'Modify currency and localization', 'currency_settings', 'update', 'settings', true),
('View Receipt Settings', 'View receipt and printing settings', 'receipt_settings', 'read', 'settings', false),
('Edit Receipt Settings', 'Modify receipt templates and printing', 'receipt_settings', 'update', 'settings', false),
('View POS Settings', 'View point-of-sale configuration', 'pos_settings', 'read', 'settings', false),
('Edit POS Settings', 'Modify POS behavior and features', 'pos_settings', 'update', 'settings', true),
('View Security Settings', 'View security and access settings', 'security_settings', 'read', 'settings', false),
('Edit Security Settings', 'Modify security policies', 'security_settings', 'update', 'settings', true),
('View Notification Settings', 'View notification preferences', 'notification_settings', 'read', 'settings', false),
('Edit Notification Settings', 'Modify notification settings', 'notification_settings', 'update', 'settings', false),
('View Integration Settings', 'View third-party integrations', 'integration_settings', 'read', 'settings', false),
('Edit Integration Settings', 'Configure external integrations', 'integration_settings', 'update', 'settings', true),
('View Location Settings', 'View store locations and warehouses', 'location_settings', 'read', 'settings', false),
('Edit Location Settings', 'Manage store locations', 'location_settings', 'update', 'settings', true),

-- Cash Management
('View Cash Drawers', 'View cash drawer information', 'cash_drawers', 'read', 'pos', false),
('Open Cash Drawers', 'Open and initialize cash drawers', 'cash_drawers', 'create', 'pos', false),
('Close Cash Drawers', 'Close and reconcile cash drawers', 'cash_drawer_closing', 'create', 'pos', false),
('Manage Cash Transactions', 'Record cash in/out transactions', 'cash_transactions', 'create', 'pos', false),
('Transfer Cash', 'Transfer cash between drawers', 'cash_transfers', 'create', 'pos', true),
('View Cash Reports', 'Access cash management reports', 'cash_reports', 'read', 'reports', false),

-- Promotions & Pricing
('View Promotions', 'View active promotions and discounts', 'promotions', 'read', 'marketing', false),
('Create Promotions', 'Create new promotions and discounts', 'promotions', 'create', 'marketing', false),
('Edit Promotions', 'Modify existing promotions', 'promotions', 'update', 'marketing', false),
('Delete Promotions', 'Remove promotions', 'promotions', 'delete', 'marketing', true),
('Manage Pricing Rules', 'Create and manage pricing strategies', 'pricing_rules', 'manage', 'marketing', false)

ON CONFLICT (resource, action, category) DO NOTHING;

-- Create permission groups for better organization
CREATE TABLE IF NOT EXISTS permission_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  description text,
  category text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_system_group boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert permission groups for bulk management
INSERT INTO permission_groups (name, display_name, description, category, permissions) VALUES
('inventory_basic', 'Inventory - Basic', 'Basic inventory viewing and stock checks', 'inventory', ARRAY['products:read', 'stock_levels:read', 'product_categories:read']),
('inventory_full', 'Inventory - Full Access', 'Complete inventory management capabilities', 'inventory', ARRAY['products:*', 'stock_levels:*', 'stock_adjustments:*', 'stock_transfers:*', 'product_categories:*', 'brands:*', 'product_units:*']),
('sales_cashier', 'Sales - Cashier', 'Basic sales processing for cashiers', 'sales', ARRAY['sales:create', 'sales:read', 'customers:read', 'sales_discounts:create', 'sales_returns:create']),
('sales_manager', 'Sales - Manager', 'Full sales management capabilities', 'sales', ARRAY['sales:*', 'customers:*', 'quotes:*', 'sales_reports:read', 'sales_discounts:*']),
('purchasing_basic', 'Purchasing - Basic', 'Basic purchasing operations', 'purchasing', ARRAY['purchases:read', 'suppliers:read', 'purchase_receiving:create']),
('purchasing_manager', 'Purchasing - Manager', 'Full purchasing management', 'purchasing', ARRAY['purchases:*', 'suppliers:*', 'purchase_reports:read', 'purchase_returns:*']),
('financial_viewer', 'Financial - Viewer', 'Read-only financial access', 'financial', ARRAY['accounts:read', 'accounting_transactions:read', 'financial_statements:read']),
('financial_manager', 'Financial - Manager', 'Full financial management', 'financial', ARRAY['accounts:*', 'accounting_transactions:*', 'financial_statements:*', 'accounts_receivable:*', 'accounts_payable:*', 'payments:*']),
('communications_basic', 'Communications - Basic', 'Basic communication capabilities', 'communication', ARRAY['communications:read', 'email_communications:create', 'email_templates:read']),
('communications_manager', 'Communications - Manager', 'Full communication management', 'communication', ARRAY['communications:*', 'email_communications:*', 'sms_communications:*', 'whatsapp_communications:*', 'email_templates:*', 'sms_templates:*', 'whatsapp_templates:*']),
('settings_viewer', 'Settings - Viewer', 'View business settings', 'settings', ARRAY['company_info:read', 'tax_settings:read', 'currency_settings:read', 'receipt_settings:read']),
('settings_admin', 'Settings - Administrator', 'Full settings management', 'settings', ARRAY['company_info:*', 'tax_settings:*', 'currency_settings:*', 'receipt_settings:*', 'pos_settings:*', 'security_settings:*', 'notification_settings:*', 'integration_settings:*', 'location_settings:*']),
('reports_basic', 'Reports - Basic', 'Basic reporting access', 'reports', ARRAY['dashboard:read', 'sales_analytics:read', 'inventory_analytics:read']),
('reports_advanced', 'Reports - Advanced', 'Advanced reporting and analytics', 'reports', ARRAY['dashboard:read', 'sales_analytics:read', 'inventory_analytics:read', 'financial_analytics:read', 'customer_analytics:read', 'report_export:create', 'report_scheduling:create'])
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on permission_groups
ALTER TABLE permission_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for permission_groups
CREATE POLICY "Tenant users can view permission groups"
ON permission_groups FOR SELECT
USING (true); -- Permission groups are system-wide

CREATE POLICY "Tenant admins can manage permission groups"
ON permission_groups FOR ALL
USING (is_system_group = false); -- Only custom groups can be managed

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_permissions_category ON system_permissions(category);
CREATE INDEX IF NOT EXISTS idx_system_permissions_resource ON system_permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permission_groups_category ON permission_groups(category);

-- Create a function to get all permissions for a permission pattern
CREATE OR REPLACE FUNCTION get_permissions_by_pattern(pattern text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result text[];
BEGIN
  -- Handle wildcard patterns like 'products:*'
  IF pattern LIKE '%:*' THEN
    SELECT ARRAY_AGG(resource || ':' || action)
    INTO result
    FROM system_permissions
    WHERE resource = SPLIT_PART(pattern, ':', 1);
  ELSE
    -- Handle specific permissions
    result := ARRAY[pattern];
  END IF;
  
  RETURN result;
END;
$$;