-- Create default account types and accounts for tenants that don't have them yet

-- Function to create default account structure for a tenant
CREATE OR REPLACE FUNCTION setup_default_accounts(tenant_id_param UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set up accounts when a user accesses accounting
CREATE OR REPLACE FUNCTION auto_setup_tenant_accounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Set up default accounts for this tenant if they don't exist
  PERFORM setup_default_accounts(NEW.tenant_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on business_settings to auto-setup accounts
DROP TRIGGER IF EXISTS trigger_auto_setup_accounts ON business_settings;
CREATE TRIGGER trigger_auto_setup_accounts
  AFTER INSERT ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION auto_setup_tenant_accounts();

-- Setup accounts for existing tenants that don't have them
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN 
    SELECT DISTINCT t.id as tenant_id 
    FROM tenants t 
    LEFT JOIN accounts a ON t.id = a.tenant_id 
    WHERE a.id IS NULL AND t.is_active = true
  LOOP
    PERFORM setup_default_accounts(tenant_record.tenant_id);
  END LOOP;
END;
$$;