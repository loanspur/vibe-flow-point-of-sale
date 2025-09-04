-- Ensure all existing tenants have default payment methods
-- This migration creates default payment methods for tenants that don't have any

-- Function to create default payment methods for a tenant if they don't exist
CREATE OR REPLACE FUNCTION public.ensure_default_payment_methods_for_tenant(tenant_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payment_method_count INTEGER;
  cash_account_id UUID;
  ar_account_id UUID;
BEGIN
  -- Check if tenant already has payment methods
  SELECT COUNT(*) INTO payment_method_count
  FROM payment_methods
  WHERE tenant_id = tenant_id_param;
  
  -- Only create defaults if no payment methods exist
  IF payment_method_count = 0 THEN
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
    INSERT INTO payment_methods (
      tenant_id, name, code, display_name, account_id, icon_name, 
      is_active, is_default, sort_order, requires_reference, description
    ) VALUES 
    (
      tenant_id_param, 'cash', 'cash', 'Cash', COALESCE(cash_account_id, ar_account_id), 'Banknote',
      true, true, 1, false, 'Cash payments'
    ),
    (
      tenant_id_param, 'card', 'card', 'Credit/Debit Card', COALESCE(cash_account_id, ar_account_id), 'CreditCard',
      true, false, 2, true, 'Credit and debit card payments'
    ),
    (
      tenant_id_param, 'digital', 'digital', 'Digital Wallet', COALESCE(cash_account_id, ar_account_id), 'Smartphone',
      true, false, 3, true, 'Mobile money and digital wallets'
    ),
    (
      tenant_id_param, 'bank_transfer', 'bank_transfer', 'Bank Transfer', COALESCE(cash_account_id, ar_account_id), 'Building2',
      true, false, 4, true, 'Direct bank transfers'
    ),
    (
      tenant_id_param, 'credit', 'credit', 'Credit Sale', ar_account_id, 'FileText',
      true, false, 5, true, 'Credit sales (accounts receivable)'
    )
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- Log the creation
    RAISE NOTICE 'Created default payment methods for tenant %', tenant_id_param;
  END IF;
END;
$$;

-- Apply to all existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT id FROM tenants WHERE id IS NOT NULL
  LOOP
    PERFORM ensure_default_payment_methods_for_tenant(tenant_record.id);
  END LOOP;
END;
$$;

-- Clean up the function
DROP FUNCTION public.ensure_default_payment_methods_for_tenant(UUID);

-- Add comment
COMMENT ON TABLE public.payment_methods IS 'Payment methods configured per tenant. Default methods are created automatically for new tenants.';
