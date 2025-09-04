-- Create payment methods table linked to accounting asset accounts
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- e.g., 'cash', 'bank_account', 'credit_card'
  display_name TEXT NOT NULL, -- e.g., 'Cash', 'Bank Account', 'Credit Card'
  account_id UUID NOT NULL, -- Links to accounts table (asset accounts)
  icon_name TEXT DEFAULT 'CreditCard', -- Icon reference for UI
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  requires_reference BOOLEAN DEFAULT false, -- Whether this payment method requires a reference number
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT unique_tenant_code UNIQUE (tenant_id, code),
  CONSTRAINT unique_tenant_account UNIQUE (tenant_id, account_id),
  
  -- Foreign key to accounts table
  CONSTRAINT fk_payment_methods_account 
    FOREIGN KEY (account_id) 
    REFERENCES public.accounts(id) 
    ON DELETE RESTRICT
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant managers can manage payment methods" 
ON public.payment_methods 
FOR ALL 
USING (
  tenant_id = get_user_tenant_id() 
  AND get_current_user_role() = ANY(ARRAY['superadmin'::user_role, 'admin'::user_role, 'manager'::user_role])
);

CREATE POLICY "Tenant users can view payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (tenant_id = get_user_tenant_id());

-- Create trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to setup default payment methods for a tenant
CREATE OR REPLACE FUNCTION public.setup_default_payment_methods(tenant_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cash_account_id UUID;
  ar_account_id UUID;
  bank_account_id UUID;
BEGIN
  -- Get default asset accounts
  SELECT id INTO cash_account_id 
  FROM accounts a
  JOIN account_types at ON a.account_type_id = at.id
  WHERE a.tenant_id = tenant_id_param 
    AND at.category = 'assets' 
    AND a.name ILIKE '%cash%' 
  LIMIT 1;
  
  SELECT id INTO ar_account_id 
  FROM accounts a
  JOIN account_types at ON a.account_type_id = at.id
  WHERE a.tenant_id = tenant_id_param 
    AND at.category = 'assets' 
    AND a.name ILIKE '%receivable%' 
  LIMIT 1;
  
  -- Try to find a bank account or create one if cash exists
  SELECT id INTO bank_account_id 
  FROM accounts a
  JOIN account_types at ON a.account_type_id = at.id
  WHERE a.tenant_id = tenant_id_param 
    AND at.category = 'assets' 
    AND (a.name ILIKE '%bank%' OR a.name ILIKE '%checking%') 
  LIMIT 1;
  
  -- If we have a cash account, create default payment methods
  IF cash_account_id IS NOT NULL THEN
    -- Cash payment method
    INSERT INTO public.payment_methods (
      tenant_id, name, code, display_name, account_id, icon_name, 
      is_active, is_default, sort_order, requires_reference, description
    ) VALUES (
      tenant_id_param, 'cash', 'cash', 'Cash', cash_account_id, 'Banknote',
      true, true, 1, false, 'Cash payments'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- Bank/Card payment method (use cash account if no bank account)
    INSERT INTO public.payment_methods (
      tenant_id, name, code, display_name, account_id, icon_name, 
      is_active, is_default, sort_order, requires_reference, description
    ) VALUES (
      tenant_id_param, 'card', 'card', 'Card Payment', COALESCE(bank_account_id, cash_account_id), 'CreditCard',
      true, false, 2, true, 'Credit/Debit card payments'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- Digital wallet payment method
    INSERT INTO public.payment_methods (
      tenant_id, name, code, display_name, account_id, icon_name, 
      is_active, is_default, sort_order, requires_reference, description
    ) VALUES (
      tenant_id_param, 'digital', 'digital', 'Digital Wallet', COALESCE(bank_account_id, cash_account_id), 'Smartphone',
      true, false, 3, true, 'Mobile money, digital wallets'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;
    
    -- Bank transfer payment method
    INSERT INTO public.payment_methods (
      tenant_id, name, code, display_name, account_id, icon_name, 
      is_active, is_default, sort_order, requires_reference, description
    ) VALUES (
      tenant_id_param, 'bank_transfer', 'bank_transfer', 'Bank Transfer', COALESCE(bank_account_id, cash_account_id), 'Building2',
      true, false, 4, true, 'Direct bank transfers'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;
  END IF;
  
  -- Credit sale method (using AR account)
  IF ar_account_id IS NOT NULL THEN
    INSERT INTO public.payment_methods (
      tenant_id, name, code, display_name, account_id, icon_name, 
      is_active, is_default, sort_order, requires_reference, description
    ) VALUES (
      tenant_id_param, 'credit', 'credit', 'Credit Sale (Pay Later)', ar_account_id, 'Building2',
      true, false, 5, true, 'Credit sales - creates accounts receivable'
    ) ON CONFLICT (tenant_id, code) DO NOTHING;
  END IF;
END;
$$;

-- Update the tenant setup function to include payment methods
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Setup default accounts
  PERFORM setup_default_accounts(NEW.id);
  
  -- Setup default features  
  PERFORM setup_tenant_default_features(NEW.id);
  
  -- Setup default user roles
  PERFORM setup_default_user_roles(NEW.id);
  
  -- Setup default business settings
  PERFORM setup_default_business_settings(NEW.id);
  
  -- Setup default payment methods (after accounts are created)
  PERFORM setup_default_payment_methods(NEW.id);
  
  RETURN NEW;
END;
$$;