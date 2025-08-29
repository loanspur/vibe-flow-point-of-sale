-- Comprehensive fix for missing columns and tables
-- Run this in your Supabase SQL editor

-- 1. Fix contacts table - add missing columns
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'customer' 
CHECK (contact_type IN ('customer', 'supplier', 'vendor', 'agent', 'shipping_agent', 'sales_rep', 'partner')),
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_zones TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shipping_documents JSONB DEFAULT '[]';

-- Add comments for contacts
COMMENT ON COLUMN contacts.contact_type IS 'Type of contact: customer, supplier, vendor, agent, shipping_agent, sales_rep, partner';
COMMENT ON COLUMN contacts.shipping_fee IS 'Default shipping fee for this shipping agent';
COMMENT ON COLUMN contacts.shipping_zones IS 'Array of shipping zones this agent serves';
COMMENT ON COLUMN contacts.shipping_documents IS 'JSON array of shipping documents and certificates';

-- 2. Fix payment_methods table - add missing columns and make tenant_id nullable
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#000000';

-- Make tenant_id nullable for global payment methods
ALTER TABLE payment_methods ALTER COLUMN tenant_id DROP NOT NULL;

-- Add comments for payment_methods
COMMENT ON COLUMN payment_methods.icon IS 'Icon emoji or identifier for the payment method';
COMMENT ON COLUMN payment_methods.color IS 'Color code for UI display';

-- 3. Fix sales table - add missing shipping columns
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS shipping_agent_id UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_tracking_number TEXT,
ADD COLUMN IF NOT EXISTS shipping_included_in_total BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS shipping_payment_status TEXT DEFAULT 'pending' CHECK (shipping_payment_status IN ('pending', 'paid', 'direct_to_agent'));

-- Add comments for sales shipping fields
COMMENT ON COLUMN sales.shipping_agent_id IS 'Reference to shipping agent contact';
COMMENT ON COLUMN sales.shipping_fee IS 'Shipping fee amount';
COMMENT ON COLUMN sales.shipping_address IS 'Shipping address for delivery';
COMMENT ON COLUMN sales.shipping_tracking_number IS 'Tracking number for shipping';
COMMENT ON COLUMN sales.shipping_included_in_total IS 'Whether shipping fee is included in total payment';
COMMENT ON COLUMN sales.shipping_payment_status IS 'Status of shipping payment';

-- 4. Create shipping_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS shipping_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id),
  shipping_agent_id UUID NOT NULL REFERENCES contacts(id),
  shipping_fee DECIMAL(15,2) NOT NULL,
  shipping_address TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'direct_to_agent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create multiple_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS multiple_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id),
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  amount DECIMAL(15,2) NOT NULL,
  reference_number TEXT,
  notes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Update existing data with default values
UPDATE contacts
SET contact_type = 'customer'
WHERE contact_type IS NULL;

UPDATE contacts
SET shipping_fee = 0.00,
    shipping_zones = '{}',
    shipping_documents = '[]'
WHERE shipping_fee IS NULL OR shipping_zones IS NULL OR shipping_documents IS NULL;

UPDATE payment_methods
SET icon = CASE 
    WHEN type = 'cash' THEN '💵'
    WHEN type = 'card' THEN '💳'
    WHEN type = 'mobile_money' THEN '📱'
    WHEN type = 'bank_transfer' THEN '🏦'
    WHEN type = 'credit' THEN '📋'
    ELSE '💰'
  END,
    color = CASE 
    WHEN type = 'cash' THEN '#28a745'
    WHEN type = 'card' THEN '#007bff'
    WHEN type = 'mobile_money' THEN '#ff6b35'
    WHEN type = 'bank_transfer' THEN '#6f42c1'
    WHEN type = 'credit' THEN '#fd7e14'
    ELSE '#20c997'
  END
WHERE icon IS NULL OR color IS NULL;

-- 7. Insert default payment methods if they don't exist (with NULL tenant_id for global methods)
INSERT INTO payment_methods (name, type, requires_reference, icon, color, tenant_id) VALUES
('Cash', 'cash', FALSE, '💵', '#28a745', NULL),
('Card', 'card', FALSE, '💳', '#007bff', NULL),
('M-Pesa', 'mobile_money', TRUE, '📱', '#ff6b35', NULL),
('Bank Transfer', 'bank_transfer', TRUE, '🏦', '#6f42c1', NULL),
('Credit', 'credit', TRUE, '📋', '#fd7e14', NULL),
('Cheque', 'other', TRUE, '📄', '#20c997', NULL)
ON CONFLICT DO NOTHING;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_shipping_agent ON contacts(contact_type) WHERE contact_type = 'shipping_agent';
CREATE INDEX IF NOT EXISTS idx_contacts_shipping_fee ON contacts(shipping_fee) WHERE shipping_fee > 0;
CREATE INDEX IF NOT EXISTS idx_shipping_orders_sale_id ON shipping_orders(sale_id);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_agent_id ON shipping_orders(shipping_agent_id);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_status ON shipping_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_multiple_payments_sale_id ON multiple_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_shipping_agent ON sales(shipping_agent_id);

-- 9. Enable RLS on new tables
ALTER TABLE shipping_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiple_payments ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies (only if they don't exist)
DO $$
BEGIN
    -- Shipping orders policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shipping_orders' AND policyname = 'Users can view shipping orders for their tenant') THEN
        CREATE POLICY "Users can view shipping orders for their tenant" ON shipping_orders
          FOR SELECT USING (tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
          ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shipping_orders' AND policyname = 'Users can insert shipping orders for their tenant') THEN
        CREATE POLICY "Users can insert shipping orders for their tenant" ON shipping_orders
          FOR INSERT WITH CHECK (tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
          ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shipping_orders' AND policyname = 'Users can update shipping orders for their tenant') THEN
        CREATE POLICY "Users can update shipping orders for their tenant" ON shipping_orders
          FOR UPDATE USING (tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
          ));
    END IF;

    -- Payment methods policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_methods' AND policyname = 'Users can view payment methods for their tenant') THEN
        CREATE POLICY "Users can view payment methods for their tenant" ON payment_methods
          FOR SELECT USING (
            tenant_id IS NULL OR tenant_id IN (
              SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
            )
          );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_methods' AND policyname = 'Users can insert payment methods for their tenant') THEN
        CREATE POLICY "Users can insert payment methods for their tenant" ON payment_methods
          FOR INSERT WITH CHECK (
            tenant_id IS NULL OR tenant_id IN (
              SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
            )
          );
    END IF;

    -- Multiple payments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'multiple_payments' AND policyname = 'Users can view multiple payments for their tenant') THEN
        CREATE POLICY "Users can view multiple payments for their tenant" ON multiple_payments
          FOR SELECT USING (tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
          ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'multiple_payments' AND policyname = 'Users can insert multiple payments for their tenant') THEN
        CREATE POLICY "Users can insert multiple payments for their tenant" ON multiple_payments
          FOR INSERT WITH CHECK (tenant_id IN (
            SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
          ));
    END IF;
END $$;
