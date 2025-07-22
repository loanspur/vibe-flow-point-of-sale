-- Force initialize the default chart of accounts for the tenant
-- First, let's manually create the missing account types and accounts

-- Insert default account types if they don't exist
INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Current Assets', 'assets', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Current Assets'
);

INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Fixed Assets', 'assets', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Fixed Assets'
);

INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Current Liabilities', 'liabilities', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Current Liabilities'
);

INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Long-term Liabilities', 'liabilities', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Long-term Liabilities'
);

INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Owner''s Equity', 'equity', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Owner''s Equity'
);

INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Revenue', 'income', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Revenue'
);

INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Other Income', 'income', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Other Income'
);

INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Operating Expenses', 'expenses', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Operating Expenses'
);

INSERT INTO account_types (tenant_id, name, category, parent_id)
SELECT '11111111-1111-1111-1111-111111111111', 'Cost of Goods Sold', 'expenses', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM account_types 
  WHERE tenant_id = '11111111-1111-1111-1111-111111111111' 
  AND name = 'Cost of Goods Sold'
);

-- Now create default accounts using the account types
-- First get the account type IDs
DO $$
DECLARE
    current_assets_id UUID;
    fixed_assets_id UUID;
    current_liabilities_id UUID;
    equity_id UUID;
    revenue_id UUID;
    cogs_id UUID;
    expenses_id UUID;
BEGIN
    -- Get account type IDs
    SELECT id INTO current_assets_id FROM account_types 
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND name = 'Current Assets';
    
    SELECT id INTO fixed_assets_id FROM account_types 
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND name = 'Fixed Assets';
    
    SELECT id INTO current_liabilities_id FROM account_types 
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND name = 'Current Liabilities';
    
    SELECT id INTO equity_id FROM account_types 
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND name = 'Owner''s Equity';
    
    SELECT id INTO revenue_id FROM account_types 
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND name = 'Revenue';
    
    SELECT id INTO cogs_id FROM account_types 
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND name = 'Cost of Goods Sold';
    
    SELECT id INTO expenses_id FROM account_types 
    WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND name = 'Operating Expenses';
    
    -- Insert default accounts if they don't exist
    INSERT INTO accounts (tenant_id, account_type_id, code, name, balance)
    SELECT '11111111-1111-1111-1111-111111111111', current_assets_id, '1000', 'Cash', 0
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND code = '1000');
    
    INSERT INTO accounts (tenant_id, account_type_id, code, name, balance)
    SELECT '11111111-1111-1111-1111-111111111111', current_assets_id, '1100', 'Accounts Receivable', 0
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND code = '1100');
    
    INSERT INTO accounts (tenant_id, account_type_id, code, name, balance)
    SELECT '11111111-1111-1111-1111-111111111111', current_assets_id, '1200', 'Inventory', 0
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND code = '1200');
    
    INSERT INTO accounts (tenant_id, account_type_id, code, name, balance)
    SELECT '11111111-1111-1111-1111-111111111111', current_liabilities_id, '2000', 'Accounts Payable', 0
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND code = '2000');
    
    INSERT INTO accounts (tenant_id, account_type_id, code, name, balance)
    SELECT '11111111-1111-1111-1111-111111111111', current_liabilities_id, '2100', 'Sales Tax Payable', 0
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND code = '2100');
    
    INSERT INTO accounts (tenant_id, account_type_id, code, name, balance)
    SELECT '11111111-1111-1111-1111-111111111111', revenue_id, '4000', 'Sales Revenue', 0
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND code = '4000');
    
    INSERT INTO accounts (tenant_id, account_type_id, code, name, balance)
    SELECT '11111111-1111-1111-1111-111111111111', cogs_id, '5000', 'Cost of Goods Sold', 0
    WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE tenant_id = '11111111-1111-1111-1111-111111111111' AND code = '5000');
    
END $$;