-- Check current constraint on cash_transactions transaction_type
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%transaction_type%';

-- Update the constraint to include 'account_transfer' as a valid transaction type
ALTER TABLE public.cash_transactions 
DROP CONSTRAINT IF EXISTS cash_transactions_transaction_type_check;

ALTER TABLE public.cash_transactions 
ADD CONSTRAINT cash_transactions_transaction_type_check 
CHECK (transaction_type IN ('sale', 'purchase', 'opening', 'closing', 'adjustment', 'withdrawal', 'deposit', 'transfer', 'account_transfer', 'change_given'));