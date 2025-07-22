-- Enhanced system permissions for comprehensive role-based access control

-- Create comprehensive permission resources enum
DO $$
BEGIN
    -- Drop existing type if it exists
    DROP TYPE IF EXISTS permission_resource CASCADE;
    
    -- Create new comprehensive permission resource type
    CREATE TYPE permission_resource AS ENUM (
        'dashboard',
        'products', 
        'product_categories',
        'product_variants',
        'inventory_management',
        'stock_adjustments',
        'sales',
        'sale_returns',
        'quotes',
        'purchases',
        'purchase_returns',
        'customers',
        'suppliers',
        'contacts',
        'accounting',
        'chart_of_accounts',
        'financial_statements',
        'accounts_receivable',
        'accounts_payable',
        'journal_entries',
        'reports',
        'sales_reports',
        'inventory_reports',
        'financial_reports',
        'user_management',
        'role_management',
        'permission_management',
        'business_settings',
        'payment_methods',
        'tax_settings',
        'location_management',
        'promotion_management',
        'loyalty_program',
        'gift_cards',
        'barcode_management',
        'data_import_export',
        'system_backup',
        'audit_logs',
        'email_notifications',
        'sms_notifications',
        'whatsapp_notifications',
        'api_access',
        'pos_system',
        'cashier_operations',
        'discount_management',
        'receipt_printing',
        'session_management'
    );
EXCEPTION
    WHEN duplicate_object THEN
        -- Type already exists, continue
        NULL;
END $$;

-- Create permission actions enum
DO $$
BEGIN
    DROP TYPE IF EXISTS permission_action CASCADE;
    
    CREATE TYPE permission_action AS ENUM (
        'create',
        'read', 
        'update',
        'delete',
        'approve',
        'void',
        'export',
        'import',
        'print',
        'email',
        'manage'
    );
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Create system permissions table
CREATE TABLE IF NOT EXISTS public.system_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource permission_resource NOT NULL,
    action permission_action NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    is_critical BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(resource, action)
);

-- Enable RLS
ALTER TABLE public.system_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system permissions
CREATE POLICY "Authenticated users can view system permissions" 
ON public.system_permissions 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only superadmins can manage system permissions" 
ON public.system_permissions 
FOR ALL 
TO authenticated
USING (get_current_user_role() = 'superadmin'::user_role);

-- Create role permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.system_permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(role_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for role permissions
CREATE POLICY "Tenant managers can view role permissions" 
ON public.role_permissions 
FOR SELECT 
USING (role_id IN (
    SELECT id FROM public.user_roles 
    WHERE tenant_id = get_user_tenant_id()
));

CREATE POLICY "Tenant managers can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (
    role_id IN (
        SELECT id FROM public.user_roles 
        WHERE tenant_id = get_user_tenant_id()
    ) AND 
    get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

-- Create triggers for updated_at
CREATE TRIGGER update_system_permissions_updated_at
    BEFORE UPDATE ON public.system_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON public.role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert comprehensive system permissions
INSERT INTO public.system_permissions (resource, action, name, description, category, is_critical) VALUES
    -- Dashboard
    ('dashboard', 'read', 'View Dashboard', 'Access main dashboard overview', 'dashboard', false),
    
    -- Products
    ('products', 'create', 'Create Products', 'Add new products to inventory', 'inventory', false),
    ('products', 'read', 'View Products', 'View product catalog', 'inventory', false),
    ('products', 'update', 'Edit Products', 'Modify existing products', 'inventory', false),
    ('products', 'delete', 'Delete Products', 'Remove products from system', 'inventory', true),
    ('products', 'import', 'Import Products', 'Bulk import product data', 'inventory', false),
    ('products', 'export', 'Export Products', 'Export product data', 'inventory', false),
    
    -- Product Categories
    ('product_categories', 'create', 'Create Categories', 'Add new product categories', 'inventory', false),
    ('product_categories', 'read', 'View Categories', 'View product categories', 'inventory', false),
    ('product_categories', 'update', 'Edit Categories', 'Modify product categories', 'inventory', false),
    ('product_categories', 'delete', 'Delete Categories', 'Remove categories', 'inventory', true),
    
    -- Product Variants
    ('product_variants', 'create', 'Create Variants', 'Add product variants', 'inventory', false),
    ('product_variants', 'read', 'View Variants', 'View product variants', 'inventory', false),
    ('product_variants', 'update', 'Edit Variants', 'Modify product variants', 'inventory', false),
    ('product_variants', 'delete', 'Delete Variants', 'Remove product variants', 'inventory', true),
    
    -- Inventory Management
    ('inventory_management', 'read', 'View Inventory', 'Access inventory overview', 'inventory', false),
    ('inventory_management', 'update', 'Adjust Inventory', 'Make inventory adjustments', 'inventory', false),
    ('inventory_management', 'manage', 'Manage Inventory', 'Full inventory management access', 'inventory', true),
    
    -- Stock Adjustments
    ('stock_adjustments', 'create', 'Create Adjustments', 'Create stock adjustments', 'inventory', false),
    ('stock_adjustments', 'read', 'View Adjustments', 'View stock adjustment history', 'inventory', false),
    ('stock_adjustments', 'approve', 'Approve Adjustments', 'Approve stock adjustments', 'inventory', true),
    
    -- Sales
    ('sales', 'create', 'Create Sales', 'Process new sales transactions', 'sales', false),
    ('sales', 'read', 'View Sales', 'View sales history and data', 'sales', false),
    ('sales', 'update', 'Edit Sales', 'Modify existing sales', 'sales', false),
    ('sales', 'void', 'Void Sales', 'Cancel/void sales transactions', 'sales', true),
    ('sales', 'print', 'Print Receipts', 'Print sales receipts', 'sales', false),
    
    -- Sale Returns
    ('sale_returns', 'create', 'Process Returns', 'Handle customer returns', 'sales', false),
    ('sale_returns', 'read', 'View Returns', 'View return history', 'sales', false),
    ('sale_returns', 'approve', 'Approve Returns', 'Approve return requests', 'sales', true),
    
    -- Quotes
    ('quotes', 'create', 'Create Quotes', 'Generate customer quotes', 'sales', false),
    ('quotes', 'read', 'View Quotes', 'View quote history', 'sales', false),
    ('quotes', 'update', 'Edit Quotes', 'Modify existing quotes', 'sales', false),
    ('quotes', 'delete', 'Delete Quotes', 'Remove quotes', 'sales', false),
    ('quotes', 'email', 'Email Quotes', 'Send quotes via email', 'sales', false),
    
    -- Purchases
    ('purchases', 'create', 'Create Purchases', 'Create purchase orders', 'purchasing', false),
    ('purchases', 'read', 'View Purchases', 'View purchase history', 'purchasing', false),
    ('purchases', 'update', 'Edit Purchases', 'Modify purchase orders', 'purchasing', false),
    ('purchases', 'approve', 'Approve Purchases', 'Approve purchase orders', 'purchasing', true),
    
    -- Purchase Returns
    ('purchase_returns', 'create', 'Process Returns', 'Handle supplier returns', 'purchasing', false),
    ('purchase_returns', 'read', 'View Returns', 'View purchase return history', 'purchasing', false),
    ('purchase_returns', 'approve', 'Approve Returns', 'Approve purchase returns', 'purchasing', true),
    
    -- Customers
    ('customers', 'create', 'Add Customers', 'Add new customers', 'crm', false),
    ('customers', 'read', 'View Customers', 'View customer database', 'crm', false),
    ('customers', 'update', 'Edit Customers', 'Modify customer information', 'crm', false),
    ('customers', 'delete', 'Delete Customers', 'Remove customers', 'crm', true),
    ('customers', 'export', 'Export Customers', 'Export customer data', 'crm', false),
    
    -- Suppliers
    ('suppliers', 'create', 'Add Suppliers', 'Add new suppliers', 'purchasing', false),
    ('suppliers', 'read', 'View Suppliers', 'View supplier database', 'purchasing', false),
    ('suppliers', 'update', 'Edit Suppliers', 'Modify supplier information', 'purchasing', false),
    ('suppliers', 'delete', 'Delete Suppliers', 'Remove suppliers', 'purchasing', true),
    
    -- Contacts
    ('contacts', 'create', 'Add Contacts', 'Add new contacts', 'crm', false),
    ('contacts', 'read', 'View Contacts', 'View contact database', 'crm', false),
    ('contacts', 'update', 'Edit Contacts', 'Modify contact information', 'crm', false),
    ('contacts', 'delete', 'Delete Contacts', 'Remove contacts', 'crm', true),
    
    -- Accounting
    ('accounting', 'read', 'View Accounting', 'Access accounting module', 'financial', false),
    ('accounting', 'manage', 'Manage Accounting', 'Full accounting system access', 'financial', true),
    
    -- Chart of Accounts
    ('chart_of_accounts', 'create', 'Create Accounts', 'Add new chart accounts', 'financial', false),
    ('chart_of_accounts', 'read', 'View Accounts', 'View chart of accounts', 'financial', false),
    ('chart_of_accounts', 'update', 'Edit Accounts', 'Modify chart accounts', 'financial', false),
    ('chart_of_accounts', 'delete', 'Delete Accounts', 'Remove chart accounts', 'financial', true),
    
    -- Financial Statements
    ('financial_statements', 'read', 'View Statements', 'View financial statements', 'financial', false),
    ('financial_statements', 'export', 'Export Statements', 'Export financial statements', 'financial', false),
    ('financial_statements', 'print', 'Print Statements', 'Print financial statements', 'financial', false),
    
    -- Accounts Receivable
    ('accounts_receivable', 'create', 'Create AR', 'Create receivable entries', 'financial', false),
    ('accounts_receivable', 'read', 'View AR', 'View accounts receivable', 'financial', false),
    ('accounts_receivable', 'update', 'Edit AR', 'Modify receivable entries', 'financial', false),
    
    -- Accounts Payable
    ('accounts_payable', 'create', 'Create AP', 'Create payable entries', 'financial', false),
    ('accounts_payable', 'read', 'View AP', 'View accounts payable', 'financial', false),
    ('accounts_payable', 'update', 'Edit AP', 'Modify payable entries', 'financial', false),
    
    -- Journal Entries
    ('journal_entries', 'create', 'Create Entries', 'Create journal entries', 'financial', false),
    ('journal_entries', 'read', 'View Entries', 'View journal entries', 'financial', false),
    ('journal_entries', 'update', 'Edit Entries', 'Modify journal entries', 'financial', false),
    ('journal_entries', 'approve', 'Approve Entries', 'Approve journal entries', 'financial', true),
    
    -- Reports
    ('reports', 'read', 'View Reports', 'Access reporting module', 'reports', false),
    ('sales_reports', 'read', 'View Sales Reports', 'View sales analytics', 'reports', false),
    ('inventory_reports', 'read', 'View Inventory Reports', 'View inventory analytics', 'reports', false),
    ('financial_reports', 'read', 'View Financial Reports', 'View financial analytics', 'reports', false),
    ('reports', 'export', 'Export Reports', 'Export report data', 'reports', false),
    
    -- User Management
    ('user_management', 'create', 'Add Users', 'Add new users to system', 'administration', true),
    ('user_management', 'read', 'View Users', 'View user accounts', 'administration', false),
    ('user_management', 'update', 'Edit Users', 'Modify user accounts', 'administration', true),
    ('user_management', 'delete', 'Delete Users', 'Remove user accounts', 'administration', true),
    
    -- Role Management
    ('role_management', 'create', 'Create Roles', 'Create user roles', 'administration', true),
    ('role_management', 'read', 'View Roles', 'View user roles', 'administration', false),
    ('role_management', 'update', 'Edit Roles', 'Modify user roles', 'administration', true),
    ('role_management', 'delete', 'Delete Roles', 'Remove user roles', 'administration', true),
    
    -- Permission Management
    ('permission_management', 'read', 'View Permissions', 'View system permissions', 'administration', false),
    ('permission_management', 'manage', 'Manage Permissions', 'Full permission management', 'administration', true),
    
    -- Business Settings
    ('business_settings', 'read', 'View Settings', 'View business configuration', 'administration', false),
    ('business_settings', 'update', 'Edit Settings', 'Modify business settings', 'administration', true),
    
    -- Payment Methods
    ('payment_methods', 'create', 'Add Payment Methods', 'Add payment methods', 'settings', false),
    ('payment_methods', 'read', 'View Payment Methods', 'View payment methods', 'settings', false),
    ('payment_methods', 'update', 'Edit Payment Methods', 'Modify payment methods', 'settings', false),
    ('payment_methods', 'delete', 'Delete Payment Methods', 'Remove payment methods', 'settings', false),
    
    -- Tax Settings
    ('tax_settings', 'read', 'View Tax Settings', 'View tax configuration', 'settings', false),
    ('tax_settings', 'update', 'Edit Tax Settings', 'Modify tax settings', 'settings', true),
    
    -- Promotion Management
    ('promotion_management', 'create', 'Create Promotions', 'Create promotional offers', 'marketing', false),
    ('promotion_management', 'read', 'View Promotions', 'View promotional campaigns', 'marketing', false),
    ('promotion_management', 'update', 'Edit Promotions', 'Modify promotions', 'marketing', false),
    ('promotion_management', 'delete', 'Delete Promotions', 'Remove promotions', 'marketing', false),
    
    -- POS System
    ('pos_system', 'read', 'Access POS', 'Access point of sale system', 'pos', false),
    ('cashier_operations', 'create', 'Process Transactions', 'Handle cashier operations', 'pos', false),
    ('discount_management', 'create', 'Apply Discounts', 'Apply transaction discounts', 'pos', false),
    ('receipt_printing', 'print', 'Print Receipts', 'Print transaction receipts', 'pos', false),
    
    -- System Administration
    ('session_management', 'manage', 'Manage Sessions', 'Manage user sessions', 'administration', true),
    ('audit_logs', 'read', 'View Audit Logs', 'Access system audit logs', 'administration', false),
    ('data_import_export', 'import', 'Import Data', 'Import system data', 'administration', true),
    ('data_import_export', 'export', 'Export Data', 'Export system data', 'administration', false),
    ('system_backup', 'manage', 'Manage Backups', 'System backup operations', 'administration', true),
    
    -- Notifications
    ('email_notifications', 'manage', 'Email Notifications', 'Manage email notifications', 'communication', false),
    ('sms_notifications', 'manage', 'SMS Notifications', 'Manage SMS notifications', 'communication', false),
    ('whatsapp_notifications', 'manage', 'WhatsApp Notifications', 'Manage WhatsApp notifications', 'communication', false),
    
    -- API Access
    ('api_access', 'manage', 'API Access', 'Manage API access and keys', 'administration', true)
ON CONFLICT (resource, action) DO NOTHING;

-- Create helper function to check user permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
    user_id_param UUID,
    resource_param permission_resource,
    action_param permission_action
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        JOIN public.user_role_assignments ura ON rp.role_id = ura.role_id
        JOIN public.system_permissions sp ON rp.permission_id = sp.id
        WHERE ura.user_id = user_id_param
        AND ura.is_active = true
        AND sp.resource = resource_param
        AND sp.action = action_param
        AND rp.granted = true
    );
$$;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_id_param UUID)
RETURNS TABLE(
    resource permission_resource,
    action permission_action,
    permission_name TEXT,
    category TEXT
)
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
    SELECT sp.resource, sp.action, sp.name, sp.category
    FROM public.role_permissions rp
    JOIN public.user_role_assignments ura ON rp.role_id = ura.role_id
    JOIN public.system_permissions sp ON rp.permission_id = sp.id
    WHERE ura.user_id = user_id_param
    AND ura.is_active = true
    AND rp.granted = true
    ORDER BY sp.category, sp.resource, sp.action;
$$;

-- Setup default permissions for existing roles
DO $$
DECLARE
    admin_role_record RECORD;
    manager_role_record RECORD;
    cashier_role_record RECORD;
    permission_record RECORD;
BEGIN
    -- For each tenant, set up default permissions
    FOR admin_role_record IN 
        SELECT * FROM public.user_roles 
        WHERE name = 'Administrator' AND is_active = true
    LOOP
        -- Admin gets all permissions
        FOR permission_record IN SELECT * FROM public.system_permissions LOOP
            INSERT INTO public.role_permissions (role_id, permission_id, granted)
            VALUES (admin_role_record.id, permission_record.id, true)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
    
    FOR manager_role_record IN 
        SELECT * FROM public.user_roles 
        WHERE name = 'Manager' AND is_active = true
    LOOP
        -- Manager gets most permissions except critical admin functions
        FOR permission_record IN 
            SELECT * FROM public.system_permissions 
            WHERE is_critical = false OR category != 'administration'
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id, granted)
            VALUES (manager_role_record.id, permission_record.id, true)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
    
    FOR cashier_role_record IN 
        SELECT * FROM public.user_roles 
        WHERE name = 'Cashier' AND is_active = true
    LOOP
        -- Cashier gets basic POS and sales permissions
        FOR permission_record IN 
            SELECT * FROM public.system_permissions 
            WHERE category IN ('pos', 'sales', 'inventory') 
            AND action IN ('read', 'create', 'print')
            AND resource NOT IN ('inventory_management', 'stock_adjustments')
        LOOP
            INSERT INTO public.role_permissions (role_id, permission_id, granted)
            VALUES (cashier_role_record.id, permission_record.id, true)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
        
        -- Add specific permissions for cashiers
        INSERT INTO public.role_permissions (role_id, permission_id, granted)
        SELECT cashier_role_record.id, sp.id, true
        FROM public.system_permissions sp
        WHERE (sp.resource = 'dashboard' AND sp.action = 'read')
        OR (sp.resource = 'customers' AND sp.action IN ('read', 'create'))
        OR (sp.resource = 'products' AND sp.action = 'read')
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
END $$;