// Create centralized accounting configuration
export const ACCOUNTING_CONFIG = {
  DEFAULT_ACCOUNT_TYPES: [
    { name: 'Current Assets', category: 'assets', parent_id: null },
    { name: 'Fixed Assets', category: 'assets', parent_id: null },
    { name: 'Current Liabilities', category: 'liabilities', parent_id: null },
    { name: 'Long-term Liabilities', category: 'liabilities', parent_id: null },
    { name: 'Owner\'s Equity', category: 'equity', parent_id: null },
    { name: 'Revenue', category: 'income', parent_id: null },
    { name: 'Operating Expenses', category: 'expenses', parent_id: null },
    { name: 'Cost of Goods Sold', category: 'expenses', parent_id: null },
  ],
  
  CATEGORY_COLORS: {
    assets: 'bg-green-500',
    liabilities: 'bg-red-500', 
    equity: 'bg-blue-500',
    income: 'bg-purple-500',
    expenses: 'bg-orange-500'
  }
};
