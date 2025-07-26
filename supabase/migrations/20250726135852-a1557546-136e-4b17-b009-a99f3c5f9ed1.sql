-- Continue fixing remaining functions with search path issues

-- Fix accounting and business functions
CREATE OR REPLACE FUNCTION public.setup_default_accounts(tenant_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  asset_type_id UUID;
  liability_type_id UUID;
  equity_type_id UUID;
  income_type_id UUID;
  expense_type_id UUID;
  cash_account_id UUID;
  inventory_account_id UUID;
  ar_account_id UUID;
  ap_account_id UUID;
  revenue_account_id UUID;
  cogs_account_id UUID;
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
$function$;

-- Fix auto setup tenant accounts trigger function
CREATE OR REPLACE FUNCTION public.auto_setup_tenant_accounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Set up default accounts for this tenant if they don't exist
  PERFORM setup_default_accounts(NEW.id);
  RETURN NEW;
END;
$function$;

-- Fix handle new tenant function
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Setup default accounts
  PERFORM setup_default_accounts(NEW.id);
  
  -- Setup default features
  PERFORM setup_tenant_default_features(NEW.id);
  
  -- Setup default user roles
  PERFORM setup_default_user_roles(NEW.id);
  
  -- Setup default business settings
  PERFORM setup_default_business_settings(NEW.id);
  
  RETURN NEW;
END;
$function$;