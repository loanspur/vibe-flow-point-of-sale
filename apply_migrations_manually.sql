-- Manual migration script to apply pending changes
-- Run this in your Supabase SQL editor

-- 1. Add wholesale pricing fields to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(15,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS retail_price DECIMAL(15,2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN products.wholesale_price IS 'Wholesale price for reseller customers';
COMMENT ON COLUMN products.retail_price IS 'Retail price for regular customers';

-- Update existing products to set retail_price = price and wholesale_price = cost_price
UPDATE products
SET retail_price = price,
    wholesale_price = cost_price
WHERE retail_price IS NULL OR wholesale_price IS NULL;

-- 2. Add wholesale pricing fields to product_variants table
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(15,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS retail_price DECIMAL(15,2) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN product_variants.wholesale_price IS 'Wholesale price for reseller customers';
COMMENT ON COLUMN product_variants.retail_price IS 'Retail price for regular customers';

-- Update existing product_variants to set retail_price = sale_price
UPDATE product_variants
SET retail_price = sale_price
WHERE retail_price IS NULL;

-- 3. Add cost_price field to product_variants table for cost tracking
ALTER TABLE product_variants
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0.00;

-- Add comment for documentation
COMMENT ON COLUMN product_variants.cost_price IS 'Cost price for this variant, used for profit calculations';

-- 4. Add reseller status and credit limit fields to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS is_reseller BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS current_credit_balance DECIMAL(15,2) DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN contacts.is_reseller IS 'Indicates if this customer is a reseller eligible for wholesale pricing';
COMMENT ON COLUMN contacts.credit_limit IS 'Maximum credit limit allowed for this customer';
COMMENT ON COLUMN contacts.current_credit_balance IS 'Current outstanding credit balance for this customer';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_wholesale_price ON products(wholesale_price) WHERE wholesale_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_retail_price ON products(retail_price) WHERE retail_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_wholesale_price ON product_variants(wholesale_price) WHERE wholesale_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_retail_price ON product_variants(retail_price) WHERE retail_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_cost_price ON product_variants(cost_price) WHERE cost_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_is_reseller ON contacts(is_reseller) WHERE is_reseller = TRUE;
CREATE INDEX IF NOT EXISTS idx_contacts_credit_limit ON contacts(credit_limit) WHERE credit_limit > 0;

-- 5. Create invoices table for customer statements
CREATE TABLE IF NOT EXISTS invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES contacts(id),
  sale_id UUID NOT NULL REFERENCES sales(id),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  total_amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) DEFAULT 0.00,
  balance_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sale_item_id UUID NOT NULL REFERENCES sale_items(id),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create credit_payments table
CREATE TABLE IF NOT EXISTS credit_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES contacts(id),
  invoice_id UUID REFERENCES invoices(id),
  payment_amount DECIMAL(15,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Add shipping agent contact type and enhance contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'customer' CHECK (contact_type IN ('customer', 'supplier', 'vendor', 'agent', 'shipping_agent', 'sales_rep', 'partner')),
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_zones TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shipping_documents JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add comments for shipping agent fields
COMMENT ON COLUMN contacts.contact_type IS 'Type of contact: customer, supplier, vendor, agent, shipping_agent, sales_rep, partner';
COMMENT ON COLUMN contacts.shipping_fee IS 'Default shipping fee for this shipping agent';
COMMENT ON COLUMN contacts.shipping_zones IS 'Array of shipping zones this agent serves';
COMMENT ON COLUMN contacts.shipping_documents IS 'JSON object containing shipping agent documents and credentials';

-- 9. Create shipping_orders table for tracking shipping payments
CREATE TABLE IF NOT EXISTS shipping_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES sales(id),
  shipping_agent_id UUID NOT NULL REFERENCES contacts(id),
  shipping_fee DECIMAL(15,2) NOT NULL,
  shipping_address TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
  payment_method TEXT DEFAULT 'cash',
  payment_reference TEXT,
  notes TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Create payment_methods table for enhanced payment options
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'credit', 'other')),
  is_active BOOLEAN DEFAULT TRUE,
  requires_reference BOOLEAN DEFAULT FALSE,
  icon TEXT,
  color TEXT DEFAULT '#000000',
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default payment methods
INSERT INTO payment_methods (name, type, requires_reference, icon, color) VALUES
('Cash', 'cash', FALSE, '💵', '#28a745'),
('Card', 'card', FALSE, '💳', '#007bff'),
('M-Pesa', 'mobile_money', TRUE, '📱', '#ff6b35'),
('Bank Transfer', 'bank_transfer', TRUE, '🏦', '#6f42c1'),
('Credit', 'credit', TRUE, '📋', '#fd7e14'),
('Cheque', 'other', TRUE, '📄', '#20c997')
ON CONFLICT DO NOTHING;

-- 11. Add shipping fields to sales table
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS shipping_agent_id UUID REFERENCES contacts(id),
ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_tracking_number TEXT,
ADD COLUMN IF NOT EXISTS shipping_included_in_total BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS shipping_payment_status TEXT DEFAULT 'pending' CHECK (shipping_payment_status IN ('pending', 'paid', 'direct_to_agent'));

-- Add comments for shipping fields
COMMENT ON COLUMN sales.shipping_agent_id IS 'Reference to shipping agent contact';
COMMENT ON COLUMN sales.shipping_fee IS 'Shipping fee amount';
COMMENT ON COLUMN sales.shipping_address IS 'Shipping address for delivery';
COMMENT ON COLUMN sales.shipping_tracking_number IS 'Tracking number for shipping';
COMMENT ON COLUMN sales.shipping_included_in_total IS 'Whether shipping fee is included in total payment';
COMMENT ON COLUMN sales.shipping_payment_status IS 'Status of shipping payment';

-- 12. Create multiple_payments table for multiple payment methods per sale
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

-- 13. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_shipping_agent ON contacts(contact_type) WHERE contact_type = 'shipping_agent';
CREATE INDEX IF NOT EXISTS idx_shipping_orders_sale_id ON shipping_orders(sale_id);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_agent_id ON shipping_orders(shipping_agent_id);
CREATE INDEX IF NOT EXISTS idx_shipping_orders_status ON shipping_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_multiple_payments_sale_id ON multiple_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_shipping_agent ON sales(shipping_agent_id);

-- 14. Create RLS policies for new tables
ALTER TABLE shipping_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiple_payments ENABLE ROW LEVEL SECURITY;

-- Shipping orders policies
CREATE POLICY "Users can view shipping orders for their tenant" ON shipping_orders
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert shipping orders for their tenant" ON shipping_orders
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update shipping orders for their tenant" ON shipping_orders
  FOR UPDATE USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- Payment methods policies
CREATE POLICY "Users can view payment methods for their tenant" ON payment_methods
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payment methods for their tenant" ON payment_methods
  FOR INSERT WITH CHECK (
    tenant_id IS NULL OR tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Multiple payments policies
CREATE POLICY "Users can view multiple payments for their tenant" ON multiple_payments
  FOR SELECT USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert multiple payments for their tenant" ON multiple_payments
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- 15. Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_contact_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update customer credit balance when credit payment is made
    UPDATE contacts 
    SET current_credit_balance = current_credit_balance - NEW.payment_amount
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Restore credit balance when payment is deleted
    UPDATE contacts 
    SET current_credit_balance = current_credit_balance + OLD.payment_amount
    WHERE id = OLD.customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for credit payments
CREATE TRIGGER trigger_update_credit_balance
  AFTER INSERT OR DELETE ON credit_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_credit_balance();

-- 16. Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  invoice_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices;
  
  invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- 17. Create function to generate shipping tracking number
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
DECLARE
  tracking_number TEXT;
BEGIN
  tracking_number := 'TRK-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
  RETURN tracking_number;
END;
$$ LANGUAGE plpgsql;

-- 18. Update existing sales to have default values for new columns
UPDATE sales 
SET shipping_fee = 0.00,
    shipping_included_in_total = TRUE,
    shipping_payment_status = 'pending'
WHERE shipping_fee IS NULL;

-- 19. Update existing contacts to have default contact_type
UPDATE contacts 
SET contact_type = 'customer'
WHERE contact_type IS NULL;

-- 20. Create view for shipping agent summary
CREATE OR REPLACE VIEW shipping_agent_summary AS
SELECT 
  c.id as agent_id,
  c.name as agent_name,
  c.shipping_fee as default_fee,
  COUNT(so.id) as total_orders,
  SUM(so.shipping_fee) as total_shipping_fees,
  COUNT(CASE WHEN so.payment_status = 'paid' THEN 1 END) as paid_orders,
  COUNT(CASE WHEN so.payment_status = 'pending' THEN 1 END) as pending_orders
FROM contacts c
LEFT JOIN shipping_orders so ON c.id = so.shipping_agent_id
WHERE c.contact_type = 'shipping_agent' AND c.is_active = TRUE
GROUP BY c.id, c.name, c.shipping_fee;

-- Grant permissions
GRANT SELECT ON shipping_agent_summary TO authenticated;

COMMIT;
