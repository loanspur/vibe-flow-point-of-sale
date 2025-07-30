-- Drop the existing constraint first
ALTER TABLE public.cash_transactions 
DROP CONSTRAINT IF EXISTS cash_transactions_transaction_type_check;

-- Add a new constraint that includes all the existing transaction types plus the new ones
ALTER TABLE public.cash_transactions 
ADD CONSTRAINT cash_transactions_transaction_type_check 
CHECK (transaction_type IN ('sale', 'purchase', 'opening', 'closing', 'adjustment', 'withdrawal', 'deposit', 'transfer', 'account_transfer', 'change_given', 'sale_payment', 'opening_balance'));