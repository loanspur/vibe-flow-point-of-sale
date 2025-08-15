-- Add comprehensive permissions for product management, sales, purchases, contacts, communications, inventory management and business settings
-- Using only valid permission_action enum values: create, read, update, delete, approve, void, export, import, print, email, manage

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
('Approve Product Changes', 'Approve product modifications', 'products', 'approve', 'inventory', true)
ON CONFLICT (resource, action) DO NOTHING;

-- Sales Management permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Sales', 'View sales transactions', 'sales', 'read', 'sales', false),
('Create Sales', 'Process new sales', 'sales', 'create', 'sales', false),
('Edit Sales', 'Modify sales transactions', 'sales', 'update', 'sales', true),
('Delete Sales', 'Remove sales transactions', 'sales', 'delete', 'sales', true),
('Void Sales', 'Void sales transactions', 'sales', 'void', 'sales', true),
('Process Refunds', 'Handle sales refunds', 'sale_returns', 'create', 'sales', true),
('Manage Discounts', 'Apply and manage discounts', 'discount_management', 'manage', 'sales', false),
('Manage Quotes', 'Create and manage quotes', 'quotes', 'manage', 'sales', false),
('Print Sales Receipts', 'Print sales receipts', 'sales', 'print', 'sales', false),
('Email Sales Receipts', 'Email sales receipts', 'sales', 'email', 'sales', false)
ON CONFLICT (resource, action) DO NOTHING;

-- Purchase Management permissions  
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Purchases', 'View purchase orders and history', 'purchases', 'read', 'purchasing', false),
('Create Purchases', 'Create new purchase orders', 'purchases', 'create', 'purchasing', false),
('Edit Purchases', 'Modify purchase orders', 'purchases', 'update', 'purchasing', true),
('Delete Purchases', 'Remove purchase orders', 'purchases', 'delete', 'purchasing', true),
('Approve Purchases', 'Approve purchase orders', 'purchases', 'approve', 'purchasing', true),
('Process Purchase Returns', 'Handle purchase returns', 'purchase_returns', 'create', 'purchasing', false),
('Manage Suppliers', 'Add and manage suppliers', 'suppliers', 'manage', 'purchasing', false),
('Print Purchase Orders', 'Print purchase orders', 'purchases', 'print', 'purchasing', false),
('Email Purchase Orders', 'Email purchase orders', 'purchases', 'email', 'purchasing', false)
ON CONFLICT (resource, action) DO NOTHING;

-- Contact Management permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Contacts', 'View contact information', 'contacts', 'read', 'crm', false),
('Create Contacts', 'Add new contacts', 'contacts', 'create', 'crm', false),
('Edit Contacts', 'Modify contact information', 'contacts', 'update', 'crm', false),
('Delete Contacts', 'Remove contacts', 'contacts', 'delete', 'crm', true),
('Import Contacts', 'Bulk import contacts', 'contacts', 'import', 'crm', false),
('Export Contacts', 'Export contact data', 'contacts', 'export', 'crm', false),
('Manage Customer Data', 'Manage customer-specific data', 'customers', 'manage', 'crm', false)
ON CONFLICT (resource, action) DO NOTHING;

-- Communication permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('Manage Email Notifications', 'Manage email communications', 'email_notifications', 'manage', 'communication', false),
('Manage SMS Notifications', 'Manage SMS messages', 'sms_notifications', 'manage', 'communication', false),
('Manage WhatsApp Messages', 'Manage WhatsApp communications', 'whatsapp_notifications', 'manage', 'communication', false),
('View Communication Logs', 'View communication history', 'communication_logs', 'read', 'communication', false)
ON CONFLICT (resource, action) DO NOTHING;

-- Inventory Management permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('View Inventory', 'View stock levels and inventory data', 'inventory_management', 'read', 'inventory', false),
('Create Stock Adjustments', 'Make stock adjustments', 'stock_adjustments', 'create', 'inventory', true),
('Approve Stock Adjustments', 'Approve stock adjustment requests', 'stock_adjustments', 'approve', 'inventory', true),
('Create Stock Transfers', 'Transfer stock between locations', 'stock_transfers', 'create', 'inventory', false),
('Manage Stock Taking', 'Perform stock taking operations', 'stock_taking', 'manage', 'inventory', true)
ON CONFLICT (resource, action) DO NOTHING;

-- Business Settings permissions
INSERT INTO system_permissions (name, description, resource, action, category, is_critical) VALUES
('Manage Tax Settings', 'Configure tax settings', 'tax_settings', 'manage', 'settings', true),
('Manage Payment Methods', 'Configure payment methods', 'payment_methods', 'manage', 'settings', false)
ON CONFLICT (resource, action) DO NOTHING;