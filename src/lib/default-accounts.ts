import { supabase } from '@/integrations/supabase/client';

// Default chart of accounts structure
const DEFAULT_ACCOUNT_TYPES = [
  // Assets
  { name: 'Current Assets', category: 'assets', parent_id: null },
  { name: 'Fixed Assets', category: 'assets', parent_id: null },
  
  // Liabilities
  { name: 'Current Liabilities', category: 'liabilities', parent_id: null },
  { name: 'Long-term Liabilities', category: 'liabilities', parent_id: null },
  
  // Equity
  { name: 'Owner\'s Equity', category: 'equity', parent_id: null },
  
  // Income
  { name: 'Revenue', category: 'income', parent_id: null },
  { name: 'Other Income', category: 'income', parent_id: null },
  
  // Expenses
  { name: 'Operating Expenses', category: 'expenses', parent_id: null },
  { name: 'Cost of Goods Sold', category: 'expenses', parent_id: null },
];

const DEFAULT_ACCOUNTS = [
  // Assets
  { code: '1000', name: 'Cash', account_type: 'Current Assets', balance: 0 },
  { code: '1100', name: 'Accounts Receivable', account_type: 'Current Assets', balance: 0 },
  { code: '1200', name: 'Inventory', account_type: 'Current Assets', balance: 0 },
  { code: '1500', name: 'Equipment', account_type: 'Fixed Assets', balance: 0 },
  
  // Liabilities
  { code: '2000', name: 'Accounts Payable', account_type: 'Current Liabilities', balance: 0 },
  { code: '2100', name: 'Sales Tax Payable', account_type: 'Current Liabilities', balance: 0 },
  
  // Equity
  { code: '3000', name: 'Owner\'s Capital', account_type: 'Owner\'s Equity', balance: 0 },
  { code: '3100', name: 'Retained Earnings', account_type: 'Owner\'s Equity', balance: 0 },
  
  // Income
  { code: '4000', name: 'Sales Revenue', account_type: 'Revenue', balance: 0 },
  { code: '4100', name: 'Service Revenue', account_type: 'Revenue', balance: 0 },
  
  // Expenses
  { code: '5000', name: 'Cost of Goods Sold', account_type: 'Cost of Goods Sold', balance: 0 },
  { code: '6000', name: 'Salaries Expense', account_type: 'Operating Expenses', balance: 0 },
  { code: '6100', name: 'Rent Expense', account_type: 'Operating Expenses', balance: 0 },
  { code: '6200', name: 'Utilities Expense', account_type: 'Operating Expenses', balance: 0 },
  { code: '6300', name: 'Office Supplies Expense', account_type: 'Operating Expenses', balance: 0 },
  { code: '6400', name: 'Discounts Given', account_type: 'Operating Expenses', balance: 0 },
];

export const initializeDefaultChartOfAccounts = async (tenantId: string) => {
  try {
    console.log('Starting chart of accounts initialization for tenant:', tenantId);
    
    // Check if account types already exist
    const { data: existingTypes, error: typesError } = await supabase
      .from('account_types')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1);

    if (typesError) {
      console.error('Error checking existing account types:', typesError);
      throw typesError;
    }

    if (existingTypes && existingTypes.length > 0) {
      console.log('Chart of accounts already exists for tenant');
      return;
    }

    console.log('No existing account types found, creating default chart...');

    // Create account types first
    const accountTypesData = DEFAULT_ACCOUNT_TYPES.map(type => ({
      ...type,
      tenant_id: tenantId
    }));

    console.log('Creating account types:', accountTypesData);

    const { data: createdTypes, error: createTypesError } = await supabase
      .from('account_types')
      .insert(accountTypesData)
      .select();

    if (createTypesError) {
      console.error('Error creating account types:', createTypesError);
      throw createTypesError;
    }

    console.log('Account types created successfully:', createdTypes);

    // Create a mapping of account type names to IDs
    const typeNameToId = createdTypes.reduce((map, type) => {
      map[type.name] = type.id;
      return map;
    }, {} as Record<string, string>);

    console.log('Account type name to ID mapping:', typeNameToId);

    // Create accounts
    const accountsData = DEFAULT_ACCOUNTS.map(account => ({
      code: account.code,
      name: account.name,
      account_type_id: typeNameToId[account.account_type],
      balance: account.balance,
      tenant_id: tenantId
    }));

    console.log('Creating accounts:', accountsData);

    const { error: createAccountsError } = await supabase
      .from('accounts')
      .insert(accountsData);

    if (createAccountsError) {
      console.error('Error creating accounts:', createAccountsError);
      throw createAccountsError;
    }

    console.log('Default chart of accounts created successfully');
    return true;
  } catch (error) {
    console.error('Error initializing default chart of accounts:', error);
    throw new Error(`Failed to initialize default chart of accounts: ${error.message}`);
  }
};