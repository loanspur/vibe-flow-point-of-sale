-- Add comprehensive permissions for product management, sales, purchases, contacts, communications, inventory management and business settings

-- Product Management permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Products', 'View product information and catalog', 'products', 'read', 'inventory', false),
('Create Products', 'Add new products to catalog', 'products', 'create', 'inventory', false),
('Edit Products', 'Modify product information', 'products', 'update', 'inventory', true),
('Delete Products', 'Remove products from catalog', 'products', 'delete', 'inventory', true),
('Import Products', 'Bulk import products', 'products', 'import', 'inventory', false),
('Export Products', 'Export product data', 'products', 'export', 'inventory', false),
('Manage Product Categories', 'Create and manage product categories', 'product_categories', 'manage', 'inventory', false),
('Manage Product Variants', 'Create and manage product variants', 'product_variants', 'manage', 'inventory', false),
('View Product History', 'View product change history', 'products', 'view_history', 'inventory', false),
('Approve Product Changes', 'Approve product modifications', 'products', 'approve', 'inventory', true)
ON CONFLICT (resource, action) DO NOTHING;

-- Sales Management permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Sales', 'View sales transactions', 'sales', 'read', 'sales', false),
('Create Sales', 'Process new sales', 'sales', 'create', 'sales', false),
('Edit Sales', 'Modify sales transactions', 'sales', 'update', 'sales', true),
('Delete Sales', 'Remove sales transactions', 'sales', 'delete', 'sales', true),
('Process Refunds', 'Handle sales refunds', 'sale_returns', 'create', 'sales', true),
('Apply Discounts', 'Apply discounts to sales', 'sales', 'discount', 'sales', false),
('View Sales Reports', 'Access sales reporting', 'sales_reports', 'read', 'reports', false),
('Manage Quotes', 'Create and manage quotes', 'quotes', 'manage', 'sales', false),
('Convert Quotes', 'Convert quotes to sales', 'quotes', 'convert', 'sales', false)
ON CONFLICT (resource, action) DO NOTHING;

-- Purchase Management permissions  
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Purchases', 'View purchase orders and history', 'purchases', 'read', 'purchasing', false),
('Create Purchases', 'Create new purchase orders', 'purchases', 'create', 'purchasing', false),
('Edit Purchases', 'Modify purchase orders', 'purchases', 'update', 'purchasing', true),
('Delete Purchases', 'Remove purchase orders', 'purchases', 'delete', 'purchasing', true),
('Approve Purchases', 'Approve purchase orders', 'purchases', 'approve', 'purchasing', true),
('Receive Purchases', 'Mark purchases as received', 'purchases', 'receive', 'purchasing', false),
('Process Purchase Returns', 'Handle purchase returns', 'purchase_returns', 'create', 'purchasing', false),
('Manage Suppliers', 'Add and manage suppliers', 'suppliers', 'manage', 'purchasing', false)
ON CONFLICT (resource, action) DO NOTHING;

-- Contact Management permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Contacts', 'View contact information', 'contacts', 'read', 'crm', false),
('Create Contacts', 'Add new contacts', 'contacts', 'create', 'crm', false),
('Edit Contacts', 'Modify contact information', 'contacts', 'update', 'crm', false),
('Delete Contacts', 'Remove contacts', 'contacts', 'delete', 'crm', true),
('Import Contacts', 'Bulk import contacts', 'contacts', 'import', 'crm', false),
('Export Contacts', 'Export contact data', 'contacts', 'export', 'crm', false),
('View Contact History', 'View contact interaction history', 'contacts', 'view_history', 'crm', false),
('Manage Customer Data', 'Manage customer-specific data', 'customers', 'manage', 'crm', false)
ON CONFLICT (resource, action) DO NOTHING;

-- Communication permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('Send Email Notifications', 'Send email communications', 'email_notifications', 'send', 'communication', false),
('Manage Email Templates', 'Create and edit email templates', 'email_notifications', 'manage_templates', 'communication', false),
('Send SMS Notifications', 'Send SMS messages', 'sms_notifications', 'send', 'communication', false),
('Manage SMS Templates', 'Create and edit SMS templates', 'sms_notifications', 'manage_templates', 'communication', false),
('Send WhatsApp Messages', 'Send WhatsApp communications', 'whatsapp_notifications', 'send', 'communication', false),
('View Communication Logs', 'View communication history', 'communication_logs', 'read', 'communication', false),
('Manage Communication Settings', 'Configure communication settings', 'communication_settings', 'manage', 'communication', true)
ON CONFLICT (resource, action) DO NOTHING;

-- Inventory Management permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Inventory', 'View stock levels and inventory data', 'inventory_management', 'read', 'inventory', false),
('Adjust Stock', 'Make stock adjustments', 'stock_adjustments', 'create', 'inventory', true),
('Transfer Stock', 'Transfer stock between locations', 'stock_transfers', 'create', 'inventory', false),
('Conduct Stock Take', 'Perform stock taking operations', 'stock_taking', 'create', 'inventory', true),
('View Stock Reports', 'Access inventory reports', 'inventory_reports', 'read', 'reports', false),
('Manage Stock Locations', 'Create and manage stock locations', 'stock_locations', 'manage', 'inventory', false),
('Set Reorder Points', 'Configure automatic reorder points', 'inventory_management', 'configure_reorder', 'inventory', false),
('Approve Stock Adjustments', 'Approve stock adjustment requests', 'stock_adjustments', 'approve', 'inventory', true)
ON CONFLICT (resource, action) DO NOTHING;

-- Business Settings permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Business Settings', 'View business configuration', 'business_settings', 'read', 'administration', false),
('Edit Business Settings', 'Modify business settings', 'business_settings', 'update', 'administration', true),
('Manage Tax Settings', 'Configure tax settings', 'tax_settings', 'manage', 'settings', true),
('Manage Payment Methods', 'Configure payment methods', 'payment_methods', 'manage', 'settings', false),
('Configure Receipt Settings', 'Setup receipt templates and settings', 'business_settings', 'configure_receipts', 'administration', false),
('Manage Business Hours', 'Set business operating hours', 'business_settings', 'manage_hours', 'administration', false),
('Configure Backup Settings', 'Setup data backup configurations', 'system_backup', 'configure', 'administration', true),
('Manage Currency Settings', 'Configure multi-currency settings', 'business_settings', 'manage_currency', 'administration', false)
ON CONFLICT (resource, action) DO NOTHING;