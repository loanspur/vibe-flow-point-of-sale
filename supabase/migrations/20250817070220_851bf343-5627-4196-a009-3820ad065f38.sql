-- Fix the quotes table foreign key constraint issue
-- First, drop the existing foreign key constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotes_customer_id_fkey' 
        AND table_name = 'quotes'
    ) THEN
        ALTER TABLE quotes DROP CONSTRAINT quotes_customer_id_fkey;
    END IF;
END $$;

-- Update the customer_id column to reference contacts table instead of customers
-- Since the system is using contacts table for customer management
ALTER TABLE quotes 
ADD CONSTRAINT quotes_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- Ensure quotes table has tenant_id properly set as NOT NULL for RLS
ALTER TABLE quotes ALTER COLUMN tenant_id SET NOT NULL;

-- Create quote_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    variant_id UUID,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    tenant_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on quote_items if not already enabled
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quote_items
CREATE POLICY IF NOT EXISTS "Tenant users can view quote items" 
ON quote_items FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY IF NOT EXISTS "Tenant staff can manage quote items" 
ON quote_items FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

-- Create invoice payment tracking table for converted quotes
CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL, -- references sales.id when payment_method = 'credit'
    payment_amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    notes TEXT,
    tenant_id UUID NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on invoice_payments
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoice_payments
CREATE POLICY IF NOT EXISTS "Tenant users can view invoice payments" 
ON invoice_payments FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY IF NOT EXISTS "Tenant staff can manage invoice payments" 
ON invoice_payments FOR ALL 
USING (tenant_id = get_user_tenant_id() AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role, 'cashier'::user_role]));

-- Update updated_at triggers for quote_items and invoice_payments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_quote_items_updated_at
    BEFORE UPDATE ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_invoice_payments_updated_at
    BEFORE UPDATE ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();