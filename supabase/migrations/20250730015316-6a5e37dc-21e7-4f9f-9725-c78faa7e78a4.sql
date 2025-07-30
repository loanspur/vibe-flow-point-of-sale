-- First, check what transaction types currently exist
SELECT DISTINCT transaction_type FROM public.cash_transactions;

-- Update any invalid transaction types to valid ones
-- 'account_transfer' should be changed to 'transfer' since that's already allowed
UPDATE public.cash_transactions 
SET transaction_type = 'transfer' 
WHERE transaction_type = 'account_transfer';

-- Now we can safely update the constraint to allow 'account_transfer' for future use
ALTER TABLE public.cash_transactions 
DROP CONSTRAINT IF EXISTS cash_transactions_transaction_type_check;

ALTER TABLE public.cash_transactions 
ADD CONSTRAINT cash_transactions_transaction_type_check 
CHECK (transaction_type IN ('sale', 'purchase', 'opening', 'closing', 'adjustment', 'withdrawal', 'deposit', 'transfer', 'account_transfer', 'change_given'));