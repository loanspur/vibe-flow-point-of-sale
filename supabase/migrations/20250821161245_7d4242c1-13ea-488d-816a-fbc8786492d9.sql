-- Fix remaining function search path security warnings
-- These are existing functions that need proper search paths for security

-- Fix existing functions with search path issues
CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_admin boolean;
BEGIN
  -- Primary: admin/owner role via tenant_users
  SELECT EXISTS (
    SELECT 1
    FROM tenant_users
    WHERE user_id = auth.uid()
      AND role IN ('admin','owner')
      AND is_active = true
  ) INTO has_admin;

  IF has_admin THEN
    RETURN true;
  END IF;

  -- Fallback: profiles with admin/superadmin role and a tenant assigned
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = auth.uid()
      AND role IN ('admin','superadmin')
      AND tenant_id IS NOT NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tenant_id_val uuid;
BEGIN
  -- Primary: active membership in tenant_users
  SELECT tu.tenant_id
  INTO tenant_id_val
  FROM tenant_users tu
  WHERE tu.user_id = auth.uid()
    AND tu.is_active = true
  LIMIT 1;

  IF tenant_id_val IS NOT NULL THEN
    RETURN tenant_id_val;
  END IF;

  -- Fallback: profiles.tenant_id (when membership is missing or inactive)
  SELECT p.tenant_id
  INTO tenant_id_val
  FROM profiles p
  WHERE p.user_id = auth.uid()
    AND p.tenant_id IS NOT NULL
  LIMIT 1;

  RETURN tenant_id_val;
END;
$$;

-- Fix setup_default_accounts function
CREATE OR REPLACE FUNCTION public.setup_default_accounts(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  asset_type_id UUID;
  liability_type_id UUID;
  equity_type_id UUID;
  income_type_id UUID;
  expense_type_id UUID;
BEGIN
  -- Check if tenant already has accounts
  IF EXISTS (SELECT 1 FROM accounts WHERE tenant_id = tenant_id_param) THEN
    RETURN;
  END IF;

  -- Create account types if they don't exist
  INSERT INTO account_types (tenant_id, name, category, parent_id)
  VALUES 
    (tenant_id_param, 'Current Assets', 'assets', NULL),
    (tenant_id_param, 'Current Liabilities', 'liabilities', NULL),
    (tenant_id_param, 'Equity', 'equity', NULL),
    (tenant_id_param, 'Revenue', 'income', NULL),
    (tenant_id_param, 'Cost of Goods Sold', 'expenses', NULL)
  ON CONFLICT DO NOTHING;

  -- Get account type IDs
  SELECT id INTO asset_type_id FROM account_types WHERE tenant_id = tenant_id_param AND category = 'assets' LIMIT 1;
  SELECT id INTO liability_type_id FROM account_types WHERE tenant_id = tenant_id_param AND category = 'liabilities' LIMIT 1;
  SELECT id INTO equity_type_id FROM account_types WHERE tenant_id = tenant_id_param AND category = 'equity' LIMIT 1;
  SELECT id INTO income_type_id FROM account_types WHERE tenant_id = tenant_id_param AND category = 'income' LIMIT 1;
  SELECT id INTO expense_type_id FROM account_types WHERE tenant_id = tenant_id_param AND category = 'expenses' LIMIT 1;

  -- Create default accounts
  INSERT INTO accounts (tenant_id, account_type_id, code, name, balance)
  VALUES 
    (tenant_id_param, asset_type_id, '1010', 'Cash', 0),
    (tenant_id_param, asset_type_id, '1020', 'Inventory', 0),
    (tenant_id_param, asset_type_id, '1030', 'Accounts Receivable', 0),
    (tenant_id_param, liability_type_id, '2010', 'Accounts Payable', 0),
    (tenant_id_param, liability_type_id, '2020', 'Sales Tax Payable', 0),
    (tenant_id_param, equity_type_id, '3010', 'Owner Equity', 0),
    (tenant_id_param, income_type_id, '4010', 'Sales Revenue', 0),
    (tenant_id_param, expense_type_id, '5010', 'Cost of Goods Sold', 0),
    (tenant_id_param, expense_type_id, '5020', 'Discount Given', 0);
END;
$$;

-- Fix setup_default_business_settings function
CREATE OR REPLACE FUNCTION public.setup_default_business_settings(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO business_settings (tenant_id, company_name, currency_code, currency_symbol, timezone, date_format)
  VALUES (
    tenant_id_param,
    'New Business',
    'KES',
    'KES',
    'Africa/Nairobi',
    'DD/MM/YYYY'
  )
  ON CONFLICT (tenant_id) DO NOTHING;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.is_tenant_admin IS 'Securely checks if current user is an admin for their tenant';
COMMENT ON FUNCTION public.get_user_tenant_id IS 'Securely retrieves current user tenant ID, used in RLS policies';
COMMENT ON FUNCTION public.setup_default_accounts IS 'Sets up default chart of accounts for new tenant';
COMMENT ON FUNCTION public.setup_default_business_settings IS 'Sets up default business settings for new tenant';