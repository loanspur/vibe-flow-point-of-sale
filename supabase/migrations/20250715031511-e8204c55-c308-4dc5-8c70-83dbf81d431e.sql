-- Create default account types for tenant
WITH tenant_id_val AS (
  SELECT id FROM tenants LIMIT 1
)
INSERT INTO account_types (tenant_id, name, category, is_active)
SELECT 
  t.id,
  account_type.name,
  account_type.category::text,
  true
FROM tenant_id_val t
CROSS JOIN (VALUES 
  ('Current Assets', 'assets'),
  ('Fixed Assets', 'assets'),
  ('Current Liabilities', 'liabilities'),
  ('Long-term Liabilities', 'liabilities'),
  ('Owner''s Equity', 'equity'),
  ('Revenue', 'income'),
  ('Other Income', 'income'),
  ('Operating Expenses', 'expenses'),
  ('Cost of Goods Sold', 'expenses')
) AS account_type(name, category)
ON CONFLICT DO NOTHING;

-- Create default accounts for tenant
WITH tenant_data AS (
  SELECT t.id as tenant_id, at.id as account_type_id, at.name as type_name
  FROM tenants t
  CROSS JOIN account_types at
  WHERE at.tenant_id = t.id
  LIMIT 1000
)
INSERT INTO accounts (tenant_id, code, name, account_type_id, balance, is_active)
SELECT 
  td.tenant_id,
  acc.code,
  acc.name,
  td.account_type_id,
  0,
  true
FROM tenant_data td
CROSS JOIN (VALUES 
  ('1000', 'Cash', 'Current Assets'),
  ('1100', 'Accounts Receivable', 'Current Assets'),
  ('1200', 'Inventory', 'Current Assets'),
  ('1500', 'Equipment', 'Fixed Assets'),
  ('2000', 'Accounts Payable', 'Current Liabilities'),
  ('2100', 'Sales Tax Payable', 'Current Liabilities'),
  ('3000', 'Owner''s Capital', 'Owner''s Equity'),
  ('3100', 'Retained Earnings', 'Owner''s Equity'),
  ('4000', 'Sales Revenue', 'Revenue'),
  ('4100', 'Service Revenue', 'Revenue'),
  ('5000', 'Cost of Goods Sold', 'Cost of Goods Sold'),
  ('6000', 'Salaries Expense', 'Operating Expenses'),
  ('6100', 'Rent Expense', 'Operating Expenses'),
  ('6200', 'Utilities Expense', 'Operating Expenses'),
  ('6300', 'Office Supplies Expense', 'Operating Expenses'),
  ('6400', 'Discounts Given', 'Operating Expenses')
) AS acc(code, name, type_name)
WHERE td.type_name = acc.type_name
ON CONFLICT DO NOTHING;