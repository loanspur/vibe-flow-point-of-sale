-- Consolidated Payment Methods Schema Migration
-- This migration consolidates all payment_methods table definitions into a single, clean schema
-- Replaces multiple conflicting migrations: 20250714085327, 20250729102008, 20250729221726, 20250725000002, 20250725000003, 20250821201825

-- Drop existing payment_methods table if it exists to start fresh
DROP TABLE IF EXISTS public.payment_methods CASCADE;

-- Create payment_methods table with final consolidated schema
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
    account_id UUID, -- Links to accounts table for accounting integration
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT fk_payment_methods_tenant 
        FOREIGN KEY (tenant_id) 
        REFERENCES public.tenants(id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_payment_methods_account 
        FOREIGN KEY (account_id) 
        REFERENCES public.accounts(id) 
        ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_payment_methods_tenant_id ON public.payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_account_id ON public.payment_methods(account_id);
CREATE INDEX idx_payment_methods_type ON public.payment_methods(type);
CREATE INDEX idx_payment_methods_active ON public.payment_methods(is_active);
CREATE INDEX idx_payment_methods_display_order ON public.payment_methods(display_order);

-- Enable Row Level Security
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tenant users can view payment methods" 
ON public.payment_methods
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant managers can manage payment methods" 
ON public.payment_methods
FOR ALL 
USING (
    tenant_id = get_user_tenant_id() 
    AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create default payment methods for a tenant
CREATE OR REPLACE FUNCTION public.setup_default_payment_methods(tenant_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    cash_account_id UUID;
    ar_account_id UUID;
BEGIN
    -- Try to find cash account
    SELECT id INTO cash_account_id 
    FROM accounts a
    JOIN account_types at ON a.account_type_id = at.id
    WHERE a.tenant_id = tenant_id_param 
      AND at.category = 'assets' 
      AND (a.name ILIKE '%cash%' OR a.name ILIKE '%petty%')
    LIMIT 1;
    
    -- Try to find AR account
    SELECT id INTO ar_account_id 
    FROM accounts a
    JOIN account_types at ON a.account_type_id = at.id
    WHERE a.tenant_id = tenant_id_param 
      AND at.category = 'assets' 
      AND (a.name ILIKE '%receivable%' OR a.name ILIKE '%ar%')
    LIMIT 1;
    
    -- Create default payment methods
    INSERT INTO public.payment_methods (
        tenant_id, 
        name, 
        type, 
        account_id, 
        is_active, 
        requires_reference, 
        description, 
        display_order
    ) VALUES 
    (
        tenant_id_param, 
        'Cash', 
        'cash', 
        COALESCE(cash_account_id, ar_account_id), 
        true, 
        false, 
        'Cash payments', 
        1
    ),
    (
        tenant_id_param, 
        'Credit/Debit Card', 
        'card', 
        COALESCE(cash_account_id, ar_account_id), 
        true, 
        true, 
        'Credit and debit card payments', 
        2
    ),
    (
        tenant_id_param, 
        'Mobile Money', 
        'mobile_money', 
        COALESCE(cash_account_id, ar_account_id), 
        true, 
        true, 
        'Mobile money and digital wallets', 
        3
    ),
    (
        tenant_id_param, 
        'Bank Transfer', 
        'bank_transfer', 
        COALESCE(cash_account_id, ar_account_id), 
        true, 
        true, 
        'Direct bank transfers', 
        4
    ),
    (
        tenant_id_param, 
        'Credit Sale', 
        'other', 
        ar_account_id, 
        true, 
        true, 
        'Credit sales (accounts receivable)', 
        5
    )
    ON CONFLICT DO NOTHING;
    
    -- Log the creation
    RAISE NOTICE 'Created default payment methods for tenant %', tenant_id_param;
END;
$$;

-- Apply default payment methods to all existing tenants
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN 
        SELECT id FROM tenants WHERE id IS NOT NULL
    LOOP
        PERFORM setup_default_payment_methods(tenant_record.id);
    END LOOP;
END;
$$;

-- Clean up the function
DROP FUNCTION public.setup_default_payment_methods(UUID);

-- Add comments for documentation
COMMENT ON TABLE public.payment_methods IS 'Payment methods configured per tenant. Default methods are created automatically for new tenants.';
COMMENT ON COLUMN public.payment_methods.account_id IS 'Links payment method to corresponding asset account in chart of accounts for financial tracking';
COMMENT ON COLUMN public.payment_methods.processing_fee_percentage IS 'Processing fee percentage (0-100) for this payment method';
COMMENT ON COLUMN public.payment_methods.minimum_amount IS 'Minimum transaction amount allowed for this payment method';
COMMENT ON COLUMN public.payment_methods.maximum_amount IS 'Maximum transaction amount allowed for this payment method';
COMMENT ON COLUMN public.payment_methods.display_order IS 'Order in which payment methods are displayed in UI';

