-- Fix payment_methods table schema and ensure compatibility
-- This migration ensures the payment_methods table has all required columns and proper constraints

-- First, ensure the payment_methods table exists with the correct structure
DO $$ 
BEGIN
    -- Check if payment_methods table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
        -- Create payment_methods table if it doesn't exist
        CREATE TABLE public.payment_methods (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('cash', 'card', 'mobile_money', 'bank_transfer', 'crypto', 'other')),
            is_active BOOLEAN NOT NULL DEFAULT true,
            requires_reference BOOLEAN NOT NULL DEFAULT false,
            description TEXT,
            processing_fee_percentage NUMERIC(5,2) DEFAULT 0.00,
            minimum_amount NUMERIC(15,2) DEFAULT 0.00,
            maximum_amount NUMERIC(15,2),
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    END IF;
END $$;

-- Add account_id column if it doesn't exist
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS account_id UUID;

-- Add foreign key constraint for account_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payment_methods_account' 
        AND table_name = 'payment_methods'
    ) THEN
        ALTER TABLE public.payment_methods 
        ADD CONSTRAINT fk_payment_methods_account 
        FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for account_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_payment_methods_account_id ON public.payment_methods(account_id);

-- Enable RLS if not already enabled
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Tenant users can view payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Tenant managers can manage payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Tenant admins can manage payment methods" ON public.payment_methods;

-- Create RLS policies for payment_methods
CREATE POLICY "Tenant users can view payment methods" ON public.payment_methods
FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage payment methods" ON public.payment_methods
FOR ALL USING (
    tenant_id = get_user_tenant_id() 
    AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_payment_methods_updated_at'
    ) THEN
        CREATE TRIGGER update_payment_methods_updated_at
        BEFORE UPDATE ON public.payment_methods
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Insert default payment methods for existing tenants if they don't exist
INSERT INTO public.payment_methods (tenant_id, name, type, is_active, requires_reference, description, processing_fee_percentage, minimum_amount, display_order)
SELECT 
    t.id,
    'Cash',
    'cash',
    true,
    false,
    'Physical cash payments',
    0.00,
    0.00,
    1
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods pm WHERE pm.tenant_id = t.id AND pm.name = 'Cash'
);

INSERT INTO public.payment_methods (tenant_id, name, type, is_active, requires_reference, description, processing_fee_percentage, minimum_amount, display_order)
SELECT 
    t.id,
    'Credit Card',
    'card', 
    true,
    true,
    'Credit and debit card payments',
    2.50,
    1.00,
    2
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM payment_methods pm WHERE pm.tenant_id = t.id AND pm.name = 'Credit Card'
);

-- Add comments for documentation
COMMENT ON TABLE public.payment_methods IS 'Payment methods configuration for each tenant';
COMMENT ON COLUMN public.payment_methods.account_id IS 'Optional link to asset account for accounting integration';
COMMENT ON COLUMN public.payment_methods.processing_fee_percentage IS 'Processing fee as percentage (0-100)';
COMMENT ON COLUMN public.payment_methods.minimum_amount IS 'Minimum transaction amount for this payment method';
COMMENT ON COLUMN public.payment_methods.maximum_amount IS 'Maximum transaction amount for this payment method (NULL = no limit)';

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'payment_methods' 
ORDER BY ordinal_position;
